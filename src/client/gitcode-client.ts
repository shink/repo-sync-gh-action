import axios, { type AxiosInstance } from 'axios';
import type { BranchInfo, CreateRepoData, FileInfo, PlatformClient, RepoInfo } from '../types';
import { isErrorWithStatus } from '../utils';

// GitCode 客户端，基于 GitLab API v4
export class GitCodeClient implements PlatformClient {
  private client: AxiosInstance;

  constructor(token: string) {
    this.client = axios.create({
      baseURL: 'https://gitcode.com/api/v4',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /** 获取仓库信息，不存在返回 null */
  async getRepository(owner: string, repo: string): Promise<RepoInfo | null> {
    try {
      const response = await this.client.get<RepoInfo>(
        `/projects/${encodeURIComponent(`${owner}/${repo}`)}`,
      );
      return response.data;
    } catch (error) {
      if (isErrorWithStatus(error, 404)) return null;
      throw error;
    }
  }

  /** 获取仓库的所有分支 */
  async getBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    const response = await this.client.get<BranchInfo[]>(
      `/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/branches`,
      { params: { per_page: 100 } },
    );
    return response.data;
  }

  /** 获取指定分支信息，不存在返回 null */
  async getBranch(owner: string, repo: string, branch: string): Promise<BranchInfo | null> {
    try {
      const response = await this.client.get<BranchInfo>(
        `/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/branches/${encodeURIComponent(branch)}`,
      );
      return response.data;
    } catch (error) {
      if (isErrorWithStatus(error, 404)) return null;
      throw error;
    }
  }

  // --- 写操作暂未实现（GitCode 当前仅作为源端使用） ---

  async createRepository(_owner: string, _repo: string, _data?: CreateRepoData): Promise<RepoInfo> {
    throw new Error('GitCode createRepository not yet supported');
  }

  async getFile(
    _owner: string,
    _repo: string,
    _path: string,
    _branch: string,
  ): Promise<FileInfo | null> {
    throw new Error('GitCode getFile not yet supported');
  }

  async createOrUpdateFile(
    _owner: string,
    _repo: string,
    _path: string,
    _content: string,
    _message: string,
    _branch: string,
    _sha?: string | null,
  ): Promise<void> {
    throw new Error('GitCode createOrUpdateFile not yet supported');
  }
}
