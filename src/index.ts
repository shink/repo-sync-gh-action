import * as core from '@actions/core';
import { createClient } from './platform';
import { parseRepo, parseBranches } from './utils';
import { buildReadmeContent, setActionOutputs, printSyncSummary } from './reporter';
import type { SyncResult } from './types';

/**
 * 主同步流程：从源平台同步仓库到目标平台
 */
export async function syncRepository(): Promise<void> {
  try {
    // 读取输入
    const srcPlatform = core.getInput('src_platform') || 'gitcode.com';
    const srcRepoInput = core.getInput('src_repo', { required: true });
    const srcToken = core.getInput('src_token', { required: true });
    const dstPlatform = core.getInput('dst_platform') || 'github.com';
    const dstRepoInput = core.getInput('dst_repo', { required: true });
    const dstToken = core.getInput('dst_token', { required: true });
    const branchesInput = core.getInput('branches') || '*';
    const force = (core.getInput('force') || 'false').toLowerCase() === 'true';
    const dryRun = (core.getInput('dry_run') || 'false').toLowerCase() === 'true';

    core.info(`Sync from ${srcPlatform}/${srcRepoInput} to ${dstPlatform}/${dstRepoInput}`);
    core.info(`Branches: ${branchesInput}, force: ${force}, dry_run: ${dryRun}`);

    // 解析源仓库与目标仓库地址
    const src = parseRepo(srcRepoInput);
    const dst = parseRepo(dstRepoInput);

    // 通过工厂创建源端与目标端客户端（平台无关）
    const srcClient = createClient(srcPlatform, srcToken);
    const dstClient = createClient(dstPlatform, dstToken);

    // 获取源仓库信息
    core.info(`Fetching source repository: ${srcRepoInput}`);
    const srcRepoInfo = await srcClient.getRepository(src.owner, src.repo);
    if (!srcRepoInfo) {
      throw new Error(`Source repository not found: ${srcRepoInput}`);
    }
    core.info(`Source repository found: ${srcRepoInfo.name}`);

    // 获取源仓库的所有分支（用于支持 "*" 通配）
    const allBranchesData = await srcClient.getBranches(src.owner, src.repo);
    const allBranchNames = allBranchesData.map((b) => b.name);
    core.info(`Available source branches: ${allBranchNames.join(', ')}`);

    // 解析出待同步的分支列表
    const branchesToSync = parseBranches(branchesInput, allBranchNames);
    core.info(`Branches to sync: ${branchesToSync.join(', ')}`);

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

    const result: SyncResult = {
      syncedBranches: [],
      failedBranches: [],
      totalAttempted: branchesToSync.length,
    };

    // 逐个分支同步
    for (const branch of branchesToSync) {
      try {
        core.info(`\n=== Syncing branch: ${branch} ===`);

        // 校验源分支是否存在
        const srcBranch = await srcClient.getBranch(src.owner, src.repo, branch);
        if (!srcBranch) {
          core.warning(`Branch ${branch} not found in source repository`);
          result.failedBranches.push(`${branch}: not found in source`);
          continue;
        }
        core.info(`Source branch ${branch} at commit: ${srcBranch.commit.id}`);

        if (dryRun) {
          core.info(`[DRY RUN] Would sync branch ${branch}`);
          result.syncedBranches.push(branch);
          continue;
        }

        // 构造 README 内容
        const readmeContent = buildReadmeContent(
          dst.repo,
          srcPlatform,
          srcRepoInput,
          branch,
          srcBranch.commit.id,
        );

        // 读取目标分支上已有的 README，据此判断是否覆盖
        const existing = await dstClient.getFile(dst.owner, dst.repo, 'README.md', branch);
        if (existing && !force) {
          core.info(
            `README.md already exists on ${branch}, skipping (set force=true to overwrite)`,
          );
          result.syncedBranches.push(branch);
          continue;
        }

        // 写入 README；已存在则带上 sha 执行更新
        await dstClient.createOrUpdateFile(
          dst.owner,
          dst.repo,
          'README.md',
          readmeContent,
          `Sync from ${srcPlatform}: ${branch} branch`,
          branch,
          existing?.sha ?? null,
        );

        core.info(`Successfully synced branch ${branch}`);
        result.syncedBranches.push(branch);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        core.error(`Failed to sync branch ${branch}: ${message}`);
        result.failedBranches.push(`${branch}: ${message}`);
      }
    }

    // 设置输出并打印汇总报告
    setActionOutputs(result);
    printSyncSummary(result);

    if (result.failedBranches.length > 0) {
      core.setFailed(`Some branches failed to sync: ${result.failedBranches.join('; ')}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${message}`);
  }
}

// 导出供测试使用
export { parseRepo, parseBranches } from './utils';
export { createClient, getSupportedPlatforms } from './platform';
export { GitCodeClient } from './client/gitcode-client';
export { GitHubClient } from './client/github-client';
export { buildReadmeContent, setActionOutputs, printSyncSummary } from './reporter';

// 直接运行时执行同步
if (require.main === module) {
  void syncRepository();
}
