import * as core from '@actions/core';
import type { SyncResult } from './types';

/**
 * 构造同步信息 README 内容
 */
export function buildReadmeContent(
  dstRepoName: string,
  srcPlatform: string,
  srcRepoInput: string,
  branch: string,
  commitId: string,
): string {
  const syncInfo = {
    synced_from: `${srcPlatform}/${srcRepoInput}`,
    synced_branch: branch,
    source_commit: commitId,
    synced_at: new Date().toISOString(),
  };

  return (
    `# ${dstRepoName}\n\n` +
    `This repository is synced from ${srcPlatform}.\n\n` +
    `## Sync Information\n\n` +
    '```json\n' +
    `${JSON.stringify(syncInfo, null, 2)}\n` +
    '```\n\n' +
    `## Original Repository\n\n` +
    `- ${srcPlatform}: https://${srcPlatform}/${srcRepoInput}\n` +
    `- Branch: ${branch}\n` +
    `- Commit: ${commitId}\n`
  );
}

/**
 * 设置 Action 输出
 */
export function setActionOutputs(result: SyncResult): void {
  core.setOutput('sync_status', result.syncedBranches.length > 0 ? 'success' : 'failed');
  core.setOutput('synced_branches', result.syncedBranches.join(','));
  core.setOutput('failed_branches', result.failedBranches.join(';'));
}

/**
 * 打印同步汇总报告
 */
export function printSyncSummary(result: SyncResult): void {
  core.info(`\n=== Sync Summary ===`);
  core.info(`Total branches attempted: ${result.totalAttempted}`);
  core.info(`Successfully synced: ${result.syncedBranches.length}`);
  core.info(`Failed: ${result.failedBranches.length}`);
}
