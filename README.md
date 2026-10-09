# Repo Sync Action

A GitHub Action that **mirror-syncs** repositories between Git hosting platforms using `git clone --mirror` + `git push --mirror`, keeping source and destination fully identical (all branches, tags, and commits).

> Currently supports GitCode and GitHub, with a pluggable architecture to add more platforms.

## Features

- Full mirror sync via `git clone --mirror` + `git push --mirror` — all branches, tags, and commits
- Auto-create destination repository if it doesn't exist
- Dry run mode for testing without side effects
- Push via HTTPS token or SSH key
- Source token optional for public repositories
- Platform-agnostic client architecture

## Supported Platforms

| Platform | Read (source) | Write (destination) |
|----------|:-------------:|:-------------------:|
| `gitcode.com` | ✅ | ❌ (not yet) |
| `github.com` | ✅ | ✅ |

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `src_platform` | Source platform (e.g. `github.com`) | No | `github.com` |
| `src_repo` | Source repository in format `owner/repo` | Yes | - |
| `src_token` | Source platform access token (optional for public repos) | No | - |
| `dst_platform` | Destination platform (e.g. `github.com`) | No | `github.com` |
| `dst_repo` | Destination repository in format `owner/repo` | Yes | - |
| `dst_token` | Destination platform access token (required if `dst_key` not provided) | No | - |
| `dst_key` | SSH private key for pushing to destination | No | - |
| `dry_run` | Dry run mode - only show what would be done | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `sync_status` | Sync status summary (`success` or `failed`) |

## Usage

### Basic Example

```yaml
name: Sync from GitCode to GitHub

on:
  schedule:
    # Run daily at midnight
    - cron: '0 0 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup Node.js
        uses: actions/setup-node@v7
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build action
        run: npm run build

      - name: Sync repository
        id: sync
        uses: shink/repo-sync-gh-action@v1
        with:
          src_platform: gitcode.com
          src_repo: 'owner/repository-name'
          src_token: ${{ secrets.GITCODE_TOKEN }}
          dst_platform: github.com
          dst_repo: ${{ github.repository }}
          dst_token: ${{ secrets.GITHUB_TOKEN }}

      - name: Display sync results
        run: |
          echo "Sync status: ${{ steps.sync.outputs.sync_status }}"
```

### Push via SSH Key

Use `dst_key` instead of `dst_token` to push via SSH:

```yaml
- name: Sync repository (SSH push)
  uses: shink/repo-sync-gh-action@v1
  with:
    src_platform: gitcode.com
    src_repo: 'owner/repository-name'
    src_token: ${{ secrets.GITCODE_TOKEN }}
    dst_platform: github.com
    dst_repo: 'org/repository-name'
    dst_token: ${{ secrets.GITHUB_TOKEN }}  # 用于 API 创建仓库
    dst_key: ${{ secrets.DEPLOY_SSH_KEY }}  # 用于 SSH 推送
```

> When `dst_key` is provided, push uses SSH protocol; `dst_token` is still used for API operations (checking/creating the destination repo). For public source repos, `src_token` can be omitted entirely.

### Sync Multiple Repositories

Use GitHub Actions `matrix` strategy to sync multiple repos in a single workflow run — each repo runs as an independent parallel job:

```yaml
jobs:
  sync:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    strategy:
      fail-fast: false          # one repo failing won't cancel the others
      matrix:
        include:
          - src_repo: 'src_org/repo1'
            dst_repo: 'dst_org/repo1'
          - src_repo: 'src_org/repo2'
            dst_repo: 'dst_org/repo2'
          - src_repo: 'src_org/repo3'
            dst_repo: 'dst_org/repo3'
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build

      - name: Sync ${{ matrix.src_repo }}
        id: sync
        uses: shink/repo-sync-gh-action@v1
        with:
          src_platform: gitcode.com
          src_repo: ${{ matrix.src_repo }}
          src_token: ${{ secrets.GITCODE_TOKEN }}
          dst_platform: github.com
          dst_repo: ${{ matrix.dst_repo }}
          dst_token: ${{ secrets.GITHUB_TOKEN }}

      - name: Display sync results
        run: |
          echo "Sync status: ${{ steps.sync.outputs.sync_status }}"
```

> **Why matrix?** Each repo syncs in parallel as a separate job. `fail-fast: false` ensures one repo's failure doesn't cancel the others.

## Setup

### 1. Create Access Tokens

#### GitCode Token
1. Go to your GitCode account settings
2. Navigate to "Access Tokens"
3. Create a new token with `read_repository` scope
4. Save the token as a GitHub secret named `GITCODE_TOKEN`

#### GitHub Token
1. Go to your GitHub account settings
2. Navigate to "Developer settings" > "Personal access tokens"
3. Create a new token with `repo` scope
4. Save the token as a GitHub secret named `GITHUB_TOKEN` (or use the built-in `GITHUB_TOKEN`)

### 2. Configure Repository Permissions

Ensure your GitHub repository has the necessary permissions for the workflow to run.

## Development

```bash
npm install          # install dependencies
npm run build        # build dist/index.js (required before running the action)
npm test            # run unit tests
npm run lint        # lint source and tests
npm run typecheck   # type-check without emitting
npm run format      # format source and tests
```

## Architecture

The action uses a **platform-agnostic `PlatformClient` interface** — both source and destination are accessed through the same abstract interface. Platform-specific clients implement this interface, and a factory (`createClient`) maps platform names to client instances.

```
src/
├── types.ts             — PlatformClient interface + shared types
├── platform.ts          — createClient() factory + getSupportedPlatforms()
├── client/
│   ├── gitcode-client.ts — GitCodeClient (GitCode V5 API)
│   └── github-client.ts  — GitHubClient (Octokit)
├── utils.ts             — parseRepo, isErrorWithStatus
├── reporter.ts          — action outputs, sync summary
└── index.ts             — main mirror sync flow (git clone --mirror + git push --mirror)
```

### How It Works

1. **Client Factory**: `createClient(src_platform, src_token)` and `createClient(dst_platform, dst_token)` create the appropriate clients based on platform names
2. **Source Check**: Verifies the source repository exists via API
3. **Target Setup**: Creates the destination repository if it doesn't exist
4. **Mirror Sync**: `git clone --mirror` from source, then `git push --mirror` to destination — syncs all branches, tags, and commits atomically
5. **Output**: Sets `sync_status` output (`success` or `failed`)

### Adding a New Platform

1. Create `src/xxx-client.ts` implementing the `PlatformClient` interface
2. Register one line in `src/platform.ts`:
   ```typescript
   'xxx.com': (token) => new XxxClient(token),
   ```
3. Add tests for the new client

## Limitations

- `git push --mirror` overwrites all refs on the destination — there is no selective branch sync
- GitCode is source-only; write operations (creating repos) are not yet implemented
- Destination repository must be under an organization (GitHub `createInOrg` API); user-level repo creation is not supported

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.
