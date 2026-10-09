import type { PlatformClient } from './types';
import { GitCodeClient } from './client/gitcode-client';
import { GitHubClient } from './client/github-client';

// 平台客户端工厂映射表：新增平台只需在此注册一行
const CLIENT_FACTORIES: Record<string, (token: string, key?: string) => PlatformClient> = {
  'gitcode.com': (token, key?) => new GitCodeClient(token, key),
  'github.com': (token, key?) => new GitHubClient(token, key),
};

/** 已支持的平台列表 */
export function getSupportedPlatforms(): string[] {
  return Object.keys(CLIENT_FACTORIES);
}

/** 根据平台名创建客户端 */
export function createClient(platform: string, token: string, key?: string): PlatformClient {
  const factory = CLIENT_FACTORIES[platform];
  if (!factory) {
    throw new Error(
      `Unsupported platform: ${platform}. Supported: ${getSupportedPlatforms().join(', ')}`,
    );
  }
  return factory(token, key);
}
