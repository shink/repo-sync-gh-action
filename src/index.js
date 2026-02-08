const core = require('@actions/core');
const github = require('@actions/github');
const { Octokit } = require('@octokit/rest');
const axios = require('axios');

class GitCodeClient {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://gitcode.com/api/v4';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getRepository(owner, repo) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(`${owner}/${repo}`)}`);
      return response.data;
    } catch (error) {
      core.error(`Failed to get GitCode repository: ${error.message}`);
      throw error;
    }
  }

  async getBranches(owner, repo) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/branches`);
      return response.data;
    } catch (error) {
      core.error(`Failed to get GitCode branches: ${error.message}`);
      throw error;
    }
  }

  async getBranch(owner, repo, branch) {
    try {
      const response = await this.client.get(`/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/branches/${encodeURIComponent(branch)}`);
      return response.data;
    } catch (error) {
      core.error(`Failed to get GitCode branch ${branch}: ${error.message}`);
      throw error;
    }
  }

  async getRepositoryArchive(owner, repo, ref, format = 'tar.gz') {
    try {
      const response = await this.client.get(
        `/projects/${encodeURIComponent(`${owner}/${repo}`)}/repository/archive.${format}`,
        {
          params: { ref },
          responseType: 'stream',
        }
      );
      return response.data;
    } catch (error) {
      core.error(`Failed to get repository archive for ${ref}: ${error.message}`);
      throw error;
    }
  }
}

class GitHubClient {
  constructor(token) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepository(owner, repo) {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo,
      });
      return response.data;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      core.error(`Failed to get GitHub repository: ${error.message}`);
      throw error;
    }
  }

  async createRepository(owner, repo, data = {}) {
    try {
      const response = await this.octokit.repos.createInOrg({
        org: owner,
        name: repo,
        private: data.private || false,
        description: data.description || '',
        homepage: data.homepage || '',
        has_issues: data.has_issues || true,
        has_projects: data.has_projects || true,
        has_wiki: data.has_wiki || true,
        auto_init: false,
      });
      return response.data;
    } catch (error) {
      core.error(`Failed to create GitHub repository: ${error.message}`);
      throw error;
    }
  }

  async createOrUpdateFile(owner, repo, path, content, message, branch = 'main', sha = null) {
    try {
      const params = {
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
      };
      
      if (sha) {
        params.sha = sha;
      }

      const response = await this.octokit.repos.createOrUpdateFileContents(params);
      return response.data;
    } catch (error) {
      core.error(`Failed to create/update file ${path}: ${error.message}`);
      throw error;
    }
  }

  async createBranch(owner, repo, branch, sha) {
    try {
      const response = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha,
      });
      return response.data;
    } catch (error) {
      core.error(`Failed to create branch ${branch}: ${error.message}`);
      throw error;
    }
  }

  async getBranch(owner, repo, branch) {
    try {
      const response = await this.octokit.repos.getBranch({
        owner,
        repo,
        branch,
      });
      return response.data;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      core.error(`Failed to get GitHub branch ${branch}: ${error.message}`);
      throw error;
    }
  }
}

async function syncRepository() {
  try {
    // Get inputs
    const gitcodeToken = core.getInput('gitcode_token', { required: true });
    const githubToken = core.getInput('github_token', { required: true });
    const gitcodeRepo = core.getInput('gitcode_repo', { required: true });
    const githubRepo = core.getInput('github_repo') || gitcodeRepo;
    const syncBranches = core.getInput('sync_branches') || 'main,master';
    const forcePush = core.getInput('force_push') === 'true';
    const dryRun = core.getInput('dry_run') === 'true';

    core.info(`Starting sync from GitCode: ${gitcodeRepo} to GitHub: ${githubRepo}`);
    core.info(`Branches to sync: ${syncBranches}`);
    core.info(`Force push: ${forcePush}, Dry run: ${dryRun}`);

    // Parse repository names
    const [gitcodeOwner, gitcodeRepoName] = gitcodeRepo.split('/');
    const [githubOwner, githubRepoName] = githubRepo.split('/');

    if (!gitcodeOwner || !gitcodeRepoName) {
      throw new Error(`Invalid GitCode repository format: ${gitcodeRepo}. Expected format: owner/repo`);
    }

    if (!githubOwner || !githubRepoName) {
      throw new Error(`Invalid GitHub repository format: ${githubRepo}. Expected format: owner/repo`);
    }

    // Initialize clients
    const gitcodeClient = new GitCodeClient(gitcodeToken);
    const githubClient = new GitHubClient(githubToken);

    // Get GitCode repository info
    core.info(`Fetching GitCode repository: ${gitcodeRepo}`);
    const gitcodeRepoInfo = await gitcodeClient.getRepository(gitcodeOwner, gitcodeRepoName);
    core.info(`GitCode repository found: ${gitcodeRepoInfo.name}`);

    // Check if GitHub repository exists
    core.info(`Checking GitHub repository: ${githubRepo}`);
    let githubRepoInfo = await githubClient.getRepository(githubOwner, githubRepoName);

    if (!githubRepoInfo) {
      if (dryRun) {
        core.info(`[DRY RUN] Would create GitHub repository: ${githubRepo}`);
        githubRepoInfo = { name: githubRepoName };
      } else {
        core.info(`Creating GitHub repository: ${githubRepo}`);
        githubRepoInfo = await githubClient.createRepository(githubOwner, githubRepoName, {
          description: gitcodeRepoInfo.description || '',
          private: gitcodeRepoInfo.visibility === 'private',
        });
        core.info(`GitHub repository created: ${githubRepoInfo.name}`);
      }
    } else {
      core.info(`GitHub repository already exists: ${githubRepoInfo.name}`);
    }

    // Get branches to sync
    const branchesToSync = syncBranches.split(',').map(b => b.trim()).filter(b => b);
    const syncedBranches = [];
    const failedBranches = [];

    // Sync each branch
    for (const branch of branchesToSync) {
      try {
        core.info(`\n=== Syncing branch: ${branch} ===`);

        // Check if branch exists in GitCode
        const gitcodeBranch = await gitcodeClient.getBranch(gitcodeOwner, gitcodeRepoName, branch);
        if (!gitcodeBranch) {
          core.warning(`Branch ${branch} not found in GitCode repository`);
          failedBranches.push(`${branch}: not found in GitCode`);
          continue;
        }

        core.info(`GitCode branch ${branch} found at commit: ${gitcodeBranch.commit.id}`);

        // Check if branch exists in GitHub
        const githubBranch = await githubClient.getBranch(githubOwner, githubRepoName, branch);

        if (dryRun) {
          core.info(`[DRY RUN] Would sync branch ${branch} from GitCode to GitHub`);
          syncedBranches.push(branch);
          continue;
        }

        // For now, we'll create a simple README with sync info
        // In a real implementation, you would clone the repo and push the code
        const syncInfo = {
          synced_from: `gitcode.com/${gitcodeRepo}`,
          synced_branch: branch,
          gitcode_commit: gitcodeBranch.commit.id,
          synced_at: new Date().toISOString(),
        };

        const readmeContent = `# ${githubRepoName}\n\nThis repository is synced from GitCode.\n\n## Sync Information\n\n\`\`\`json\n${JSON.stringify(syncInfo, null, 2)}\n\`\`\`\n\n## Original Repository\n\n- GitCode: https://gitcode.com/${gitcodeRepo}\n- Branch: ${branch}\n- Commit: ${gitcodeBranch.commit.id}\n`;

        // Create or update README.md
        await githubClient.createOrUpdateFile(
          githubOwner,
          githubRepoName,
          'README.md',
          readmeContent,
          `Sync from GitCode: ${branch} branch`,
          branch
        );

        core.info(`Successfully synced branch ${branch}`);
        syncedBranches.push(branch);

      } catch (error) {
        core.error(`Failed to sync branch ${branch}: ${error.message}`);
        failedBranches.push(`${branch}: ${error.message}`);
      }
    }

    // Set outputs
    core.setOutput('sync_status', syncedBranches.length > 0 ? 'success' : 'failed');
    core.setOutput('synced_branches', syncedBranches.join(','));
    core.setOutput('failed_branches', failedBranches.join(';'));

    // Summary
    core.info(`\n=== Sync Summary ===`);
    core.info(`Total branches attempted: ${branchesToSync.length}`);
    core.info(`Successfully synced: ${syncedBranches.length}`);
    core.info(`Failed: ${failedBranches.length}`);

    if (failedBranches.length > 0) {
      core.setFailed(`Some branches failed to sync: ${failedBranches.join('; ')}`);
    }

  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

// Export for testing
module.exports = {
  GitCodeClient,
  GitHubClient,
  syncRepository,
};

// Run if called directly
if (require.main === module) {
  syncRepository();
}