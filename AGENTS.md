# AGENTS.md

Guidance for OpenCode agents working in this repo. A GitHub Action (JS) that syncs
repositories from GitCode to GitHub. Single source file: `src/index.js`.

## Commands

```bash
npm install            # install deps (required before build/test/lint)
npm run build          # ncc bundle src/index.js -> dist/index.js  (REQUIRED before the action can run)
npm test               # BROKEN: jest finds 0 tests (see Testing below)
npm run lint           # eslint src/**/*.js
npm run format         # prettier --write src/**/*.js
```

## Build is mandatory, and dist is gitignored

`action.yml` runs `dist/index.js` (`using: 'node20'`), but `dist/` is in `.gitignore`.
After **any** change to `src/`, run `npm run build` or the action silently runs stale/missing
code. For a tagged release, `dist/index.js` must be force-added (`git add -f dist`) — otherwise
`shink/repo-sync-gh-action@v1` users get no action code. Local `uses: ./` workflows must build
first (the example workflow does `npm ci` then `npm run build` before `uses: ./`).

## Testing

`npm test` is broken by default: `package.json` runs `jest` with no jest config, and jest's default
`testMatch` does **not** discover `test/basic-test.js` (4 files checked, 0 matches, exit 1).
The test file is plain Node `assert` — run it directly instead:

```bash
node test/basic-test.js    # works, exit 0
```

It does not actually exercise the clients or `syncRepository`; it only checks string-parsing
shapes. Real coverage requires adding a jest config or rewriting tests.

## The "sync" is not a real sync

`syncRepository()` does **not** clone or push code. For each branch it writes a `README.md`
containing sync metadata to the target GitHub repo via the Contents API. This is by design
(see README "Limitations"), but an agent asked to "fix sync" should know real clone+push
is unimplemented.

## Dead inputs / dead code (do not assume they work)

- `force_push` input is read into `forcePush` but **never used** in the logic.
- `GitCodeClient.getRepositoryArchive()` is defined but **never called**.
- `github_repo` defaults to `gitcode_repo`; `sync_branches` defaults to `"main,master"`.

## GitCode client is GitLab-API v4, not GitHub

`GitCodeClient` targets `https://gitcode.com/api/v4` (GitLab-style). Project paths use
`encodeURIComponent(\`${owner}/${repo}\`)`. Don't model GitCode calls on the GitHub/Octokit SDK.

## Source of truth for inputs is action.yml

`.github/workflows/sync-example.yml` is **out of sync** with `action.yml` and must not be copied
as a contract: it passes inputs that don't exist (`src_platform`, `src_repo`, `src_token`,
`dst_platform`, `dst_repo`, `dst_token`, `branches`, `force`), references `actions/checkout@v6`
and `actions/setup-node@v6` (no such majors exist), and the "Display sync results" step reads
`steps.sync.outputs.*` without any `id: sync` on the sync step. The real, declared inputs are in
`action.yml`: `gitcode_token`, `github_token`, `gitcode_repo`, `github_repo`, `sync_branches`,
`force_push`, `dry_run`.

## CodeGraph

A `.codegraph/` index exists at the repo root — prefer `codegraph_explore` for code questions
in this repo over manual grep/Read loops.
