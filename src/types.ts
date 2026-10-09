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

// 创建仓库时传入的可选数据
export interface CreateRepoData {
  description?: string;
  private?: boolean;
}

// 镜像同步结果
export interface SyncResult {
  success: boolean;
  sourceRepo: string;
  destRepo: string;
  error?: string;
}

// 平台客户端接口：源端与目标端统一通过此接口操作
// 镜像同步模式下只需检查仓库存在性、创建目标仓库、获取 Git URL
// 新增平台只需实现此接口并在 platform.ts 工厂表中注册一行
export interface PlatformClient {
  /** 获取仓库信息，不存在返回 null */
  getRepository(owner: string, repo: string): Promise<RepoInfo | null>;
  /** 创建仓库 */
  createRepository(owner: string, repo: string, data?: CreateRepoData): Promise<RepoInfo>;
  /** 返回带认证的 Git clone/push URL */
  getGitUrl(owner: string, repo: string): string;
}
