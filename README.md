# Repo Sync Action

A GitHub Action that synchronizes repositories between Git hosting platforms.

> Currently supports GitCode and GitHub, with a pluggable architecture to add more platforms.

## Features

- Sync repositories between any supported source and destination platforms
- Sync all branches (`branches: '*'`) or a comma-separated list
- Dry run mode for testing without side effects
- Force overwrite of existing files on the destination
- Auto-create destination repository if it doesn't exist
- Detailed sync metadata written to README.md on each synced branch

## Supported Platforms

| Platform | Read (source) | Write (destination) |
|----------|:-------------:|:-------------------:|
| `gitcode.com` | ✅ | ❌ (not yet) |
| `github.com` | ✅ | ✅ |

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `src_platform` | Source platform (e.g. `gitcode.com`) | No | `gitcode.com` |
| `src_repo` | Source repository in format `owner/repo` | Yes | - |
| `src_token` | Source platform access token | Yes | - |
| `dst_platform` | Destination platform (e.g. `github.com`) | No | `github.com` |
| `dst_repo` | Destination repository in format `owner/repo` | Yes | - |
| `dst_token` | Destination platform access token | Yes | - |
| `branches` | Branches to sync, comma-separated, or `*` for all | No | `*` |
| `force` | Overwrite existing files on the destination | No | `false` |
| `dry_run` | Dry run mode - only show what would be done | No | `false` |

## Outputs

| Output | Description |
|--------|-------------|
| `sync_status` | Sync status summary (`success` or `failed`) |
| `synced_branches` | List of successfully synced branches |
| `failed_branches` | List of branches that failed to sync |

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
        uses: ./
        with:
          src_platform: gitcode.com
          src_repo: 'owner/repository-name'
          src_token: ${{ secrets.GITCODE_TOKEN }}
          dst_platform: github.com
          dst_repo: ${{ github.repository }}
          dst_token: ${{ secrets.GITHUB_TOKEN }}
          branches: '*'
          force: true

      - name: Display sync results
        run: |
          echo "Sync status: ${{ steps.sync.outputs.sync_status }}"
          echo "Synced branches: ${{ steps.sync.outputs.synced_branches }}"
          echo "Failed branches: ${{ steps.sync.outputs.failed_branches }}"
```

### Sync Specific Branches

```yaml
- name: Sync specific branches
  uses: shink/repo-sync-gh-action@v1
  with:
    src_platform: gitcode.com
    src_repo: 'opensource/project'
    src_token: ${{ secrets.GITCODE_PAT }}
    dst_platform: github.com
    dst_repo: 'myorg/project-fork'
    dst_token: ${{ secrets.GH_PAT }}
    branches: 'main,master,develop'
    force: false
```

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
│   ├── gitcode-client.ts — GitCodeClient (GitLab API v4)
│   └── github-client.ts  — GitHubClient (Octokit)
├── utils.ts             — parseRepo, parseBranches, isErrorWithStatus
├── reporter.ts          — README content builder, action outputs, sync summary
└── index.ts             — main sync flow
```

### How It Works

1. **Client Factory**: `createClient(src_platform, src_token)` and `createClient(dst_platform, dst_token)` create the appropriate clients based on platform names
2. **Source Repository**: Fetches repository info and all branches from the source platform
3. **Target Repository**: Creates the destination repository if it doesn't exist
4. **Branch Sync**: For each branch:
   - Checks if the branch exists in the source repository
   - Checks if README.md already exists on the destination branch
   - If `force=true` or file doesn't exist: writes sync metadata to README.md
5. **Output**: Sets `sync_status`, `synced_branches`, and `failed_branches` outputs

### Adding a New Platform

1. Create `src/xxx-client.ts` implementing the `PlatformClient` interface
2. Register one line in `src/platform.ts`:
   ```typescript
   'xxx.com': (token) => new XxxClient(token),
   ```
3. Add tests for the new client

## Limitations

- Currently writes sync metadata to README.md instead of full code sync (clone + push)
- `branches: '*'` fetches up to 100 branches per page; repositories with more branches may be partially synced
- GitCode is read-only (source); write operations are not yet implemented
- Branch names are matched literally — glob patterns like `release/*` are not expanded

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.
