// 单元测试：验证仓库地址解析、客户端工厂与 Git URL 生成逻辑
import { parseRepo } from '../src/utils';
import { createClient, getSupportedPlatforms } from '../src/platform';

describe('parseRepo', () => {
  it('parses owner/repo', () => {
    expect(parseRepo('cann/hccl')).toEqual({ owner: 'cann', repo: 'hccl' });
  });

  it('parses org/project-name', () => {
    expect(parseRepo('org/project-name')).toEqual({ owner: 'org', repo: 'project-name' });
  });

  it('parses user123/my-repo-123', () => {
    expect(parseRepo('user123/my-repo-123')).toEqual({ owner: 'user123', repo: 'my-repo-123' });
  });

  it('throws on missing owner', () => {
    expect(() => parseRepo('/repo')).toThrow();
  });

  it('throws on missing repo', () => {
    expect(() => parseRepo('owner/')).toThrow();
  });

  it('throws on invalid format without slash', () => {
    expect(() => parseRepo('invalid')).toThrow();
  });

  it('throws on too many parts', () => {
    expect(() => parseRepo('a/b/c')).toThrow();
  });
});

describe('createClient', () => {
  it('creates a client for gitcode.com', () => {
    const client = createClient('gitcode.com', 'test-token');
    expect(client).toBeDefined();
    expect(typeof client.getRepository).toBe('function');
    expect(typeof client.getGitUrl).toBe('function');
  });

  it('creates a client for github.com', () => {
    const client = createClient('github.com', 'test-token');
    expect(client).toBeDefined();
    expect(typeof client.getRepository).toBe('function');
    expect(typeof client.getGitUrl).toBe('function');
  });

  it('throws for unsupported platform', () => {
    expect(() => createClient('gitlab.com', 'test-token')).toThrow(/Unsupported platform/);
  });
});

describe('getGitUrl', () => {
  it('returns HTTPS URL with token for gitcode.com', () => {
    const client = createClient('gitcode.com', 'my-token');
    const url = client.getGitUrl('cann', 'hccl');
    expect(url).toBe('https://oauth2:my-token@gitcode.com/cann/hccl.git');
  });

  it('returns HTTPS URL with token for github.com', () => {
    const client = createClient('github.com', 'my-token');
    const url = client.getGitUrl('org', 'repo');
    expect(url).toBe('https://x-access-token:my-token@github.com/org/repo.git');
  });

  it('returns SSH URL when key is provided (gitcode.com)', () => {
    const client = createClient('gitcode.com', 'my-token', 'ssh-key');
    const url = client.getGitUrl('cann', 'hccl');
    expect(url).toBe('git@gitcode.com:cann/hccl.git');
  });

  it('returns SSH URL when key is provided (github.com)', () => {
    const client = createClient('github.com', 'my-token', 'ssh-key');
    const url = client.getGitUrl('org', 'repo');
    expect(url).toBe('git@github.com:org/repo.git');
  });

  it('returns anonymous HTTPS URL when no token or key (gitcode.com)', () => {
    const client = createClient('gitcode.com', '');
    const url = client.getGitUrl('cann', 'hccl');
    expect(url).toBe('https://gitcode.com/cann/hccl.git');
  });

  it('returns anonymous HTTPS URL when no token or key (github.com)', () => {
    const client = createClient('github.com', '');
    const url = client.getGitUrl('org', 'repo');
    expect(url).toBe('https://github.com/org/repo.git');
  });
});

describe('getSupportedPlatforms', () => {
  it('lists supported platforms', () => {
    const platforms = getSupportedPlatforms();
    expect(platforms).toContain('gitcode.com');
    expect(platforms).toContain('github.com');
  });
});
