import { Octokit } from '@octokit/rest';
import type { BranchInfo, CreateRepoData, FileInfo, PlatformClient, RepoInfo } from '../types';
import { isErrorWithStatus } from '../utils';

// GitHub 客户端，基于 Octokit
export class GitHubClient implements PlatformClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
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

  /** 获取仓库的所有分支 */
  async getBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    const { data } = await this.octokit.repos.listBranches({ owner, repo, per_page: 100 });
    return data.map((b) => ({ name: b.name, commit: { id: b.commit.sha } }));
  }

  /** 获取指定分支，不存在返回 null */
  async getBranch(owner: string, repo: string, branch: string): Promise<BranchInfo | null> {
    try {
      const { data } = await this.octokit.repos.getBranch({ owner, repo, branch });
      return { name: data.name, commit: { id: data.commit.sha } };
    } catch (error) {
      if (isErrorWithStatus(error, 404)) return null;
      throw error;
    }
  }

  /** 获取分支上的文件内容，不存在返回 null */
  async getFile(
    owner: string,
    repo: string,
    path: string,
    branch: string,
  ): Promise<FileInfo | null> {
    try {
      const { data } = await this.octokit.repos.getContent({ owner, repo, path, ref: branch });
      if (Array.isArray(data)) return null;
      return { sha: data.sha };
    } catch (error) {
      if (isErrorWithStatus(error, 404)) return null;
      throw error;
    }
  }

  /** 创建或更新文件 */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha: string | null = null,
  ): Promise<void> {
    const params: Parameters<typeof this.octokit.repos.createOrUpdateFileContents>[0] = {
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch,
    };
    if (sha) params.sha = sha;
    await this.octokit.repos.createOrUpdateFileContents(params);
  }
}
