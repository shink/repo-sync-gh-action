# AGENTS.md

Guidance for OpenCode agents working in this repo. A GitHub Action (TypeScript)
that mirror-syncs Git repositories between platforms via `git clone --mirror` +
`git push --mirror`.

## Commands

```bash
npm install            # install deps (required before build/test/lint)
npm run typecheck      # tsc --noEmit
npm run lint           # eslint src test --ext .ts
npm test               # jest (ts-jest preset, testMatch **/test/**/*.ts)
npm run build          # ncc build src/index.ts -o dist --license licenses.txt
npm run format         # prettier --write src/**/*.ts test/**/*.ts
```

Recommended order before committing: `typecheck → lint → test → build`.

## dist/ is git-tracked — rebuild and commit it

Unlike most Action repos, `dist/` is **not** gitignored. `dist/index.js` and
`dist/licenses.txt` are committed, and the **Check dist** CI workflow
(`.github/workflows/check-dist.yml`) rebuilds `dist/` and fails if `git diff
dist/` shows drift. After **any** change to `src/`, run `npm run build` and
commit the updated `dist/` in the same PR — otherwise CI fails.

`action.yml` runs `dist/index.js` with `node20`. Local `uses: ./` workflows
must `npm ci && npm run build` before invoking the action.

## Testing

`npm test` works: `jest.config.js` uses the `ts-jest` preset with
`testMatch: ['**/test/**/*.ts']`. The single test file `test/basic-test.ts`
covers `parseRepo`, `createClient`, `getGitUrl`, and `getSupportedPlatforms`.

Tests are **pure-function only** — no client API calls, no `syncRepository`
coverage, no network/mock layer. Real client behavior is untested.

## Architecture

Platform-agnostic `PlatformClient` interface (`src/types.ts`) with a factory
(`createClient` in `src/platform.ts`). Both source and destination are accessed
through the same interface.

```
src/
├── index.ts             main mirror sync flow (git clone --mirror + git push --mirror)
├── types.ts             PlatformClient interface + shared types
├── platform.ts          createClient() factory — register new platforms here
├── client/
│   ├── gitcode-client.ts  GitCode V5 API (axios)
│   └── github-client.ts   GitHub (Octokit)
├── utils.ts             parseRepo, isErrorWithStatus
└── reporter.ts          setActionOutputs, printSyncSummary
```

### Adding a new platform

1. Create `src/client/xxx-client.ts` implementing `PlatformClient`.
2. Register one line in `src/platform.ts` `CLIENT_FACTORIES`.
3. Add tests in `test/basic-test.ts`.

## Platform quirks

- **GitCode uses V5 API** (`https://api.gitcode.com/api/v5`), not GitLab v4 and
  not GitHub-style. Client is axios-based, auth via `Bearer` token. Do not model
  GitCode calls on Octokit or GitLab SDK patterns.
- **GitCode is source-only**: `createRepository()` throws. It cannot be used as
  a destination.
- **GitHub `createRepository` is org-level only** (`octokit.repos.createInOrg`).
  User-level repo creation is not supported — destination repo must be under an
  org.

## How the sync actually works

`syncRepository()` in `src/index.ts` is a **real mirror sync**, not a metadata
write:

1. `createClient()` for source and destination via factory.
2. `srcClient.getRepository()` — verify source exists (404 → null → fail).
3. `dstClient.getRepository()` — if missing and not dry-run, `createRepository()`.
4. `git clone --mirror <srcGitUrl> <tmpDir>` — bare clone of all refs.
5. `git push [–dry-run] <dstGitUrl> refs/heads/*:refs/heads/* refs/tags/*:refs/tags/*`
   — pushes branches and tags only (skips `refs/tmp/*`, `refs/pull/*`).
6. Cleans up tmp dir and SSH key file.

Push uses SSH (`git@host:owner/repo.git`) when `dst_key` is provided, otherwise
HTTPS with embedded token. `dst_token` is still required for the API
check/create step even when `dst_key` is used for push.

## Inputs (source of truth: action.yml)

`src_platform`, `src_repo`, `src_token`, `dst_platform`, `dst_repo`,
`dst_token`, `dst_key`, `dry_run`. Output: `sync_status` (`success`|`failed`).

Either `dst_token` or `dst_key` must be provided (enforced in `syncRepository`).
`src_token` is optional (public repos work without it).

## CI

Three workflows on push/PR to `main`:

- **Test** (`test.yml`): `npm test` then `npm run build`.
- **Lint** (`lint.yml`): `npm run lint`.
- **Check dist** (`check-dist.yml`): rebuilds `dist/` and fails on drift —
  ensures committed `dist/` matches `src/`.

## CodeGraph

A `.codegraph/` index exists at the repo root — prefer `codegraph_explore`
for code questions in this repo over manual grep/Read loops.
