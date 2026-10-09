import type { RepoRef } from './types';

/**
 * 解析 "owner/repo" 格式的仓库地址
 * @param repo - 仓库地址，例如 "cann/hccl"
 * @returns 解析出的 owner 与 repo
 * @throws 格式不合法时抛出错误
 */
export function parseRepo(repo: string): RepoRef {
  const parts = (repo || '').split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repository format: ${repo}. Expected format: owner/repo`);
  }
  return { owner: parts[0], repo: parts[1] };
}

/**
 * 判断错误是否带有指定 HTTP 状态码
 * 用于在 catch 中区分 404（仓库不存在）等情况
 */
export function isErrorWithStatus(error: unknown, status: number): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { status?: unknown };
  return e.status === status;
}
