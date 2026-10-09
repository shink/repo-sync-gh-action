// 仓库引用：owner/repo 解析结果
export interface RepoRef {
  owner: string;
  repo: string;
}

// 仓库信息（平台无关，仅使用到的字段）
export interface RepoInfo {
  name: string;
  description?: string;
  visibility?: string;
}

// 分支信息（平台无关）
export interface BranchInfo {
  name: string;
  commit: { id: string };
}

// 文件信息（平台无关，仅使用到的字段）
export interface FileInfo {
  sha?: string;
}

// 创建仓库时传入的可选数据
export interface CreateRepoData {
  description?: string;
  private?: boolean;
}

// 同步结果
export interface SyncResult {
  syncedBranches: string[];
  failedBranches: string[];
  totalAttempted: number;
}

// 平台客户端接口：源端与目标端统一通过此接口操作
// 新增平台只需实现此接口并在 platform.ts 工厂表中注册一行
export interface PlatformClient {
  /** 获取仓库信息，不存在返回 null */
  getRepository(owner: string, repo: string): Promise<RepoInfo | null>;
  /** 获取仓库的所有分支 */
  getBranches(owner: string, repo: string): Promise<BranchInfo[]>;
  /** 获取指定分支信息，不存在返回 null */
  getBranch(owner: string, repo: string, branch: string): Promise<BranchInfo | null>;
  /** 创建仓库 */
  createRepository(owner: string, repo: string, data?: CreateRepoData): Promise<RepoInfo>;
  /** 获取分支上的文件内容，不存在返回 null */
  getFile(owner: string, repo: string, path: string, branch: string): Promise<FileInfo | null>;
  /** 创建或更新文件 */
  createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string | null,
  ): Promise<void>;
}
