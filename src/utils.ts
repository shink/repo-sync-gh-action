import type { RepoRef } from './types';

/**
 * 解析 "owner/repo" 格式的仓库地址
 * @param repo - 仓库地址，例如 "cann/hccl"
 * @returns 解析出的 owner 与 repo
 */
export function parseRepo(repo: string): RepoRef {
  const parts = (repo || '').split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repository format: ${repo}. Expected format: owner/repo`);
  }
  return { owner: parts[0], repo: parts[1] };
}

/**
 * 解析分支输入
 * - "*" 表示同步源仓库的全部分支（需传入 allBranches）
 * - 逗号分隔的字符串会被拆分为分支名数组
 * - 空输入默认返回 ["main", "master"]
 * @param branches - 分支输入，例如 "*" 或 "main,master"
 * @param allBranches - 源仓库的所有分支名（仅当输入为 "*" 时使用）
 * @returns 待同步的分支名列表
 */
export function parseBranches(branches: string, allBranches: string[] = []): string[] {
  const trimmed = (branches || '').trim();
  if (trimmed === '*') return allBranches;
  if (!trimmed) return ['main', 'master'];
  return trimmed
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
}

/**
 * 判断错误是否带有指定 HTTP 状态码
 * 用于在 catch 中区分 404 等情况
 */
export function isErrorWithStatus(error: unknown, status: number): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { status?: unknown };
  return e.status === status;
}
