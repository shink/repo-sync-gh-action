import * as core from '@actions/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { createClient } from './platform';
import { parseRepo } from './utils';
import { setActionOutputs, printSyncSummary } from './reporter';
import type { SyncResult } from './types';

/** 同步执行命令，stdout/stderr 直接输出到控制台 */
function runCmd(
  cmd: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
): void {
  execFileSync(cmd, args, {
    stdio: ['pipe', 'inherit', 'inherit'],
    ...options,
  });
}

/**
 * 主同步流程：通过 git clone --mirror + git push --mirror 镜像同步仓库
 * 源仓库的所有分支、tag、commit 会被完整同步到目标仓库
 */
export async function syncRepository(): Promise<void> {
  // 读取输入
  const srcPlatform = core.getInput('src_platform') || 'github.com';
  const srcRepoInput = core.getInput('src_repo', { required: true });
  const srcToken = core.getInput('src_token') || '';
  const dstPlatform = core.getInput('dst_platform') || 'github.com';
  const dstRepoInput = core.getInput('dst_repo', { required: true });
  const dstToken = core.getInput('dst_token') || '';
  const dstKey = core.getInput('dst_key') || '';
  const dryRun = (core.getInput('dry_run') || 'false').toLowerCase() === 'true';
  const lfs = (core.getInput('lfs') || 'false').toLowerCase() === 'true';

  // 校验：目标端必须提供 dst_token 或 dst_key 之一
  if (!dstToken && !dstKey) {
    throw new Error('Either dst_token or dst_key must be provided');
  }

  if (lfs) {
    core.info('LFS sync enabled, verifying git-lfs installation...');
    try {
      runCmd('git', ['lfs', 'version']);
    } catch {
      throw new Error('git-lfs is not installed on the runner but lfs=true was requested');
    }
  }

  core.info(`Mirror sync from ${srcPlatform}/${srcRepoInput} to ${dstPlatform}/${dstRepoInput}`);
  core.info(`dry_run: ${dryRun}, lfs: ${lfs}, push via ${dstKey ? 'SSH key' : 'HTTPS token'}`);

  const result: SyncResult = {
    success: false,
    sourceRepo: srcRepoInput,
    destRepo: dstRepoInput,
  };

  try {
    // 解析仓库地址
    const src = parseRepo(srcRepoInput);
    const dst = parseRepo(dstRepoInput);

    // 通过工厂创建源端与目标端客户端（平台无关）
    const srcClient = createClient(srcPlatform, srcToken);
    const dstClient = createClient(dstPlatform, dstToken, dstKey || undefined);

    // 检查源仓库是否存在
    core.info(`Fetching source repository: ${srcRepoInput}`);
    const srcRepoInfo = await srcClient.getRepository(src.owner, src.repo);
    if (!srcRepoInfo) {
      throw new Error(`Source repository not found: ${srcRepoInput}`);
    }
    core.info(`Source repository found: ${srcRepoInfo.name}`);

    // 检查目标仓库是否存在，不存在则创建
    core.info(`Checking target repository: ${dstRepoInput}`);
    let dstRepoInfo = await dstClient.getRepository(dst.owner, dst.repo);
    if (!dstRepoInfo) {
      if (dryRun) {
        core.info(`[DRY RUN] Would create target repository: ${dstRepoInput}`);
        dstRepoInfo = { name: dst.repo };
      } else {
        core.info(`Creating target repository: ${dstRepoInput}`);
        dstRepoInfo = await dstClient.createRepository(dst.owner, dst.repo, {
          description: srcRepoInfo.description || '',
          private: srcRepoInfo.visibility === 'private',
        });
        core.info(`Target repository created: ${dstRepoInfo.name}`);
      }
    } else {
      core.info(`Target repository already exists: ${dstRepoInfo.name}`);
    }

    // 获取带认证的 Git URL
    const srcGitUrl = srcClient.getGitUrl(src.owner, src.repo);
    const dstGitUrl = dstClient.getGitUrl(dst.owner, dst.repo);

    // 若使用 SSH key 推送，写入临时密钥文件并设置 GIT_SSH_COMMAND
    let sshKeyFile: string | undefined;
    if (dstKey) {
      sshKeyFile = path.join(os.tmpdir(), `repo-sync-key-${Date.now()}`);
      fs.writeFileSync(sshKeyFile, dstKey, { mode: 0o600 });
    }
    const pushEnv: NodeJS.ProcessEnv | undefined = sshKeyFile
      ? { ...process.env, GIT_SSH_COMMAND: `ssh -i ${sshKeyFile} -o StrictHostKeyChecking=no` }
      : undefined;

    // LFS 启用时设置 GIT_LFS_SKIP_SMUDGE，避免 clone/fetch 触发 smudge 过滤
    const lfsEnv: NodeJS.ProcessEnv = { ...(pushEnv ?? process.env), GIT_LFS_SKIP_SMUDGE: '1' };

    // 创建临时目录用于镜像克隆
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repo-sync-'));
    try {
      // 镜像克隆源仓库（包含所有分支、tag、commit 的裸仓库）
      core.info('Cloning source repository (mirror)...');
      runCmd('git', ['clone', '--mirror', srcGitUrl, tmpDir], {
        env: lfs ? lfsEnv : undefined,
      });

      // LFS: 从源端拉取所有 LFS 大文件对象（mirror clone 不会自动获取 LFS objects）
      if (lfs) {
        core.info('Fetching LFS objects from source...');
        runCmd('git', ['lfs', 'fetch', '--all'], { cwd: tmpDir, env: lfsEnv });
      }

      // 仅推送所有分支与标签，跳过 refs/tmp/*、refs/pull/* 等非标准 ref
      // dry-run 模式下传入 --dry-run，不实际执行
      const pushArgs = ['push'];
      if (dryRun) pushArgs.push('--dry-run');
      pushArgs.push(dstGitUrl, 'refs/heads/*:refs/heads/*', 'refs/tags/*:refs/tags/*');
      core.info('Pushing branches and tags to destination repository...');
      runCmd('git', pushArgs, { cwd: tmpDir, env: pushEnv });

      // 推送 LFS 文件
      // git lfs push 不支持 --dry-run，dry-run 模式下跳过
      if (lfs) {
        if (dryRun) {
          core.info('[DRY RUN] Would push LFS objects to destination');
        } else {
          core.info('Pushing LFS objects to destination...');
          runCmd('git', ['lfs', 'push', '--all', dstGitUrl], { cwd: tmpDir, env: lfsEnv });
        }
      }

      core.info('Sync completed successfully');
      result.success = true;
    } finally {
      // 清理临时目录与 SSH 密钥文件
      fs.rmSync(tmpDir, { recursive: true, force: true });
      if (sshKeyFile) fs.unlinkSync(sshKeyFile);
    }

    setActionOutputs(result);
    printSyncSummary(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.error = message;
    setActionOutputs(result);
    printSyncSummary(result);
    core.setFailed(`Mirror sync failed: ${message}`);
  }
}

// 导出供测试使用
export { parseRepo } from './utils';
export { createClient, getSupportedPlatforms } from './platform';
export { GitCodeClient } from './client/gitcode-client';
export { GitHubClient } from './client/github-client';
export { setActionOutputs, printSyncSummary } from './reporter';

// 直接运行时执行同步
if (require.main === module) {
  void syncRepository();
}
