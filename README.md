# GitCode to GitHub Sync Action

A GitHub Action that synchronizes repositories from GitCode to GitHub.

## Features

- Sync repositories from GitCode to GitHub
- Support for multiple branches
- Dry run mode for testing
- Force push option
- Repository creation if not exists
- Detailed sync information in README

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `gitcode_token` | GitCode personal access token | Yes | - |
| `github_token` | GitHub personal access token | Yes | - |
| `gitcode_repo` | GitCode repository in format "owner/repo" | Yes | - |
| `github_repo` | GitHub repository in format "owner/repo" | No | Same as gitcode_repo |
| `sync_branches` | Comma-separated list of branches to sync | No | "main,master" |
| `force_push` | Force push to GitHub | No | "false" |
| `dry_run` | Dry run mode - only show what would be done | No | "false" |

## Outputs

| Output | Description |
|--------|-------------|
| `sync_status` | Sync status summary ("success" or "failed") |
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
    # Allow manual triggering

jobs:
  sync:
    runs-on: ubuntu-latest
    
    steps:
      - name: Sync repository
        uses: shink/repo-sync-gh-action@v1
        with:
          gitcode_token: ${{ secrets.GITCODE_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          gitcode_repo: 'owner/repository-name'
          github_repo: 'owner/repository-name'
          sync_branches: 'main,develop,feature/*'
```

### Advanced Example

```yaml
name: Sync with Custom Settings

on:
  push:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Sync from GitCode
        uses: shink/repo-sync-gh-action@v1
        with:
          gitcode_token: ${{ secrets.GITCODE_PAT }}
          github_token: ${{ secrets.GH_PAT }}
          gitcode_repo: 'opensource/project'
          github_repo: 'myorg/project-fork'
          sync_branches: 'main,release/*'
          force_push: 'true'
          dry_run: 'false'
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

### Build

```bash
npm install
npm run build
```

### Test

```bash
npm test
```

### Lint

```bash
npm run lint
```

## How It Works

1. **Authentication**: Uses provided tokens to authenticate with GitCode and GitHub APIs
2. **Repository Check**: Verifies if the GitCode repository exists and is accessible
3. **GitHub Repository**: Creates the GitHub repository if it doesn't exist
4. **Branch Sync**: For each specified branch:
   - Checks if branch exists in GitCode
   - Creates/updates the branch in GitHub
   - Adds sync information to README.md
5. **Output**: Provides detailed sync results and status

## Limitations

- Currently creates README files with sync info instead of full code sync
- For full code synchronization, consider using git commands to clone and push
- Rate limiting may apply for large repositories

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.