// 单元测试：验证仓库地址解析、分支解析与客户端工厂逻辑
import { parseRepo, parseBranches } from '../src/utils';
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

describe('parseBranches', () => {
  it('returns all branches for "*"', () => {
    expect(parseBranches('*', ['main', 'master', 'dev'])).toEqual(['main', 'master', 'dev']);
  });

  it('returns all branches for " * " (whitespace trimmed)', () => {
    expect(parseBranches(' * ', ['main', 'master'])).toEqual(['main', 'master']);
  });

  it('splits a comma-separated list', () => {
    expect(parseBranches('main,master')).toEqual(['main', 'master']);
  });

  it('splits and trims whitespace', () => {
    expect(parseBranches('main, master, develop ')).toEqual(['main', 'master', 'develop']);
  });

  it('ignores empty entries', () => {
    expect(parseBranches('main,,master,')).toEqual(['main', 'master']);
  });

  it('handles a single branch', () => {
    expect(parseBranches('main')).toEqual(['main']);
  });

  it('defaults to ["main","master"] when empty', () => {
    expect(parseBranches('')).toEqual(['main', 'master']);
  });

  it('defaults to ["main","master"] when undefined', () => {
    expect(parseBranches(undefined as unknown as string)).toEqual(['main', 'master']);
  });

  it('returns empty array for "*" with no allBranches given', () => {
    expect(parseBranches('*')).toEqual([]);
  });
});

describe('createClient', () => {
  it('creates a client for gitcode.com', () => {
    const client = createClient('gitcode.com', 'test-token');
    expect(client).toBeDefined();
    expect(typeof client.getRepository).toBe('function');
  });

  it('creates a client for github.com', () => {
    const client = createClient('github.com', 'test-token');
    expect(client).toBeDefined();
    expect(typeof client.getRepository).toBe('function');
  });

  it('throws for unsupported platform', () => {
    expect(() => createClient('gitlab.com', 'test-token')).toThrow(/Unsupported platform/);
  });
});

describe('getSupportedPlatforms', () => {
  it('lists supported platforms', () => {
    const platforms = getSupportedPlatforms();
    expect(platforms).toContain('gitcode.com');
    expect(platforms).toContain('github.com');
  });
});
