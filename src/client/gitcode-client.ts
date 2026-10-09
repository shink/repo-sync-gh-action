import axios, { type AxiosInstance } from 'axios';
import type { CreateRepoData, PlatformClient, RepoInfo } from '../types';
import { isErrorWithStatus } from '../utils';

// GitCode 客户端，基于 GitCode V5 API (https://api.gitcode.com/api/v5)
export class GitCodeClient implements PlatformClient {
  private client: AxiosInstance;
  private token: string;
  private key?: string;

  constructor(token: string, key?: string) {
    this.token = token;
    this.key = key;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    this.client = axios.create({
      baseURL: 'https://api.gitcode.com/api/v5',
      headers,
    });
  }

  /** 获取仓库信息，不存在返回 null */
  async getRepository(owner: string, repo: string): Promise<RepoInfo | null> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}`);
      const data = response.data;
      return {
        name: data.name,
        description: data.description ?? '',
        visibility: data.private ? 'private' : 'public',
      };
    } catch (error) {
      if (isErrorWithStatus(error, 404)) return null;
      throw error;
    }
  }

  // GitCode 当前仅作为源端使用，不支持创建仓库
  async createRepository(_owner: string, _repo: string, _data?: CreateRepoData): Promise<RepoInfo> {
    throw new Error('GitCode createRepository not yet supported');
  }

  /**
   * 返回 Git clone/push URL
   * - 有 SSH key 时返回 SSH 协议 URL
   * - 有 token 时返回嵌入 token 的 HTTPS URL
   * - 都没有时返回匿名 HTTPS URL（仅适用于公开仓库）
   */
  getGitUrl(owner: string, repo: string): string {
    if (this.key) return `git@gitcode.com:${owner}/${repo}.git`;
    if (this.token) return `https://oauth2:${this.token}@gitcode.com/${owner}/${repo}.git`;
    return `https://gitcode.com/${owner}/${repo}.git`;
  }
}
