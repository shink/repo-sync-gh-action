import { Octokit } from '@octokit/rest';
import type { CreateRepoData, PlatformClient, RepoInfo } from '../types';
import { isErrorWithStatus } from '../utils';

// GitHub 客户端，基于 Octokit
export class GitHubClient implements PlatformClient {
  private octokit: Octokit;
  private token: string;
  private key?: string;

  constructor(token: string, key?: string) {
    this.token = token;
    this.key = key;
    this.octokit = new Octokit(token ? { auth: token } : {});
  }

  /** 获取仓库信息，不存在返回 null */
  async getRepository(owner: string, repo: string): Promise<RepoInfo | null> {
    try {
      const { data } = await this.octokit.repos.get({ owner, repo });
      return { name: data.name, description: data.description ?? '', visibility: data.visibility };
    } catch (error) {
      if (isErrorWithStatus(error, 404)) return null;
      throw error;
    }
  }

  /** 在组织下创建仓库 */
  async createRepository(
    owner: string,
    repo: string,
    data: CreateRepoData = {},
  ): Promise<RepoInfo> {
    const response = await this.octokit.repos.createInOrg({
      org: owner,
      name: repo,
      private: data.private ?? false,
      description: data.description ?? '',
      auto_init: false,
    });
    return { name: response.data.name };
  }

  /**
   * 返回 Git clone/push URL
   * - 有 SSH key 时返回 SSH 协议 URL
   * - 有 token 时返回嵌入 token 的 HTTPS URL
   * - 都没有时返回匿名 HTTPS URL（仅适用于公开仓库）
   */
  getGitUrl(owner: string, repo: string): string {
    if (this.key) return `git@github.com:${owner}/${repo}.git`;
    if (this.token) return `https://x-access-token:${this.token}@github.com/${owner}/${repo}.git`;
    return `https://github.com/${owner}/${repo}.git`;
  }
}
