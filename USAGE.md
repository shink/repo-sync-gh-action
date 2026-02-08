# GitCode to GitHub Sync Action - 使用指南

## 概述

这是一个用于从 GitCode 仓库同步到 GitHub 仓库的 GitHub Action。该 Action 使用 Node.js 编写，利用 GitHub SDK 操作 GitHub 仓库，使用 GitCode API 操作 GitCode 仓库。

## 功能特性

- ✅ 从 GitCode 同步仓库到 GitHub
- ✅ 支持多分支同步
- ✅ 自动创建 GitHub 仓库（如果不存在）
- ✅ 干运行模式（测试模式）
- ✅ 强制推送选项
- ✅ 详细的同步信息和状态输出

## 快速开始

### 1. 创建必要的访问令牌

#### GitCode 访问令牌
1. 登录 GitCode 账户
2. 进入"设置" → "访问令牌"
3. 创建新令牌，选择 `read_repository` 权限
4. 将令牌保存为 GitHub 仓库的 Secret，命名为 `GITCODE_TOKEN`

#### GitHub 访问令牌
1. 登录 GitHub 账户
2. 进入"Settings" → "Developer settings" → "Personal access tokens" → "Tokens (classic)"
3. 创建新令牌，选择 `repo` 权限
4. 将令牌保存为 GitHub 仓库的 Secret，命名为 `GITHUB_TOKEN`（或使用内置的 `GITHUB_TOKEN`）

### 2. 创建 GitHub Actions 工作流

在您的 GitHub 仓库中创建 `.github/workflows/sync.yml` 文件：

```yaml
name: Sync from GitCode to GitHub

on:
  schedule:
    # 每天 UTC 时间午夜运行
    - cron: '0 0 * * *'
  workflow_dispatch:
    # 允许手动触发
    inputs:
      gitcode_repo:
        description: 'GitCode 仓库 (owner/repo)'
        required: true
      branches:
        description: '要同步的分支 (逗号分隔)'
        required: false
        default: 'main,master'

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      
    steps:
      - name: Sync repository
        uses: shink/repo-sync-gh-action@v1
        with:
          gitcode_token: ${{ secrets.GITCODE_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          gitcode_repo: 'your-username/your-repo'
          github_repo: 'your-username/your-repo'
          sync_branches: ${{ github.event.inputs.branches || 'main,master' }}
          dry_run: false
```

### 3. 本地开发和测试

#### 克隆仓库
```bash
git clone https://github.com/shink/repo-sync-gh-action.git
cd repo-sync-gh-action
```

#### 安装依赖
```bash
npm install
```

#### 构建 Action
```bash
npm run build
```

#### 运行测试
```bash
npm test
```

## 配置选项

### 输入参数

| 参数 | 描述 | 必需 | 默认值 |
|------|------|------|--------|
| `gitcode_token` | GitCode 个人访问令牌 | 是 | - |
| `github_token` | GitHub 个人访问令牌 | 是 | - |
| `gitcode_repo` | GitCode 仓库，格式为 "owner/repo" | 是 | - |
| `github_repo` | GitHub 仓库，格式为 "owner/repo" | 否 | 与 gitcode_repo 相同 |
| `sync_branches` | 要同步的分支列表（逗号分隔） | 否 | "main,master" |
| `force_push` | 强制推送到 GitHub | 否 | "false" |
| `dry_run` | 干运行模式 - 只显示将要执行的操作 | 否 | "false" |

### 输出参数

| 输出 | 描述 |
|------|------|
| `sync_status` | 同步状态摘要 ("success" 或 "failed") |
| `synced_branches` | 成功同步的分支列表 |
| `failed_branches` | 同步失败的分支列表 |

## 高级用法

### 同步到不同的 GitHub 仓库

```yaml
- name: Sync to different GitHub repo
  uses: shink/repo-sync-gh-action@v1
  with:
    gitcode_token: ${{ secrets.GITCODE_TOKEN }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    gitcode_repo: 'gitcode-owner/repo'
    github_repo: 'github-org/different-repo-name'
    sync_branches: 'main,develop,release/*'
```

### 使用强制推送

```yaml
- name: Sync with force push
  uses: shink/repo-sync-gh-action@v1
  with:
    gitcode_token: ${{ secrets.GITCODE_TOKEN }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    gitcode_repo: 'owner/repo'
    force_push: 'true'
```

### 测试模式（干运行）

```yaml
- name: Test sync (dry run)
  uses: shink/repo-sync-gh-action@v1
  with:
    gitcode_token: ${{ secrets.GITCODE_TOKEN }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    gitcode_repo: 'owner/repo'
    dry_run: 'true'
```

## 工作原理

1. **认证**：使用提供的令牌与 GitCode 和 GitHub API 进行认证
2. **仓库检查**：验证 GitCode 仓库是否存在且可访问
3. **GitHub 仓库**：如果 GitHub 仓库不存在则创建
4. **分支同步**：对每个指定的分支：
   - 检查分支是否存在于 GitCode
   - 在 GitHub 中创建/更新分支
   - 添加同步信息到 README.md
5. **输出**：提供详细的同步结果和状态

## 故障排除

### 常见问题

1. **认证失败**
   - 检查令牌是否有效且未过期
   - 确认令牌具有正确的权限范围
   - 验证 Secret 名称是否正确

2. **仓库不存在**
   - 确认仓库名称格式正确（owner/repo）
   - 检查仓库是否公开或您是否有访问权限

3. **分支同步失败**
   - 确认分支存在于 GitCode 仓库中
   - 检查网络连接和 API 限制

### 调试模式

在 GitHub Actions 工作流中启用调试日志：

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

## API 参考

### GitCode API
- 文档：https://docs.gitcode.com/docs/apis/
- 基础 URL：`https://gitcode.com/api/v4`

### GitHub API
- 文档：https://docs.github.com/en/rest
- 使用 Octokit SDK 进行集成

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目基于 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如有问题或需要帮助，请：
1. 查看 [README.md](README.md) 和本文档
2. 检查 GitHub Issues 中是否有类似问题
3. 创建新的 Issue 描述您的问题