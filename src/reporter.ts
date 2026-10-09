import * as core from '@actions/core';
import type { SyncResult } from './types';

/** 设置 Action 输出 */
export function setActionOutputs(result: SyncResult): void {
  core.setOutput('sync_status', result.success ? 'success' : 'failed');
}

/** 打印同步汇总报告 */
export function printSyncSummary(result: SyncResult): void {
  core.info(`\n=== Sync Summary ===`);
  core.info(`Source: ${result.sourceRepo}`);
  core.info(`Destination: ${result.destRepo}`);
  core.info(`Status: ${result.success ? 'success' : 'failed'}`);
  if (result.error) {
    core.info(`Error: ${result.error}`);
  }
}
