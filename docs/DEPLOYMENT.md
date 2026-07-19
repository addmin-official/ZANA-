# ZANA Production Deployment

ZANA uses one authoritative production path:

> GitHub Actions → Wrangler → Cloudflare Worker and Static Assets

Firebase Hosting and Bun are not part of the production deployment system.

## Automatic releases

Every push to `main` starts the **ZANA Production CI/CD** workflow. The workflow:

1. Checks out the exact commit.
2. Installs dependencies from `package-lock.json` with `npm ci`.
3. Validates package and deployment configuration.
4. Runs lint, strict TypeScript checking, and all tests.
5. Builds the Vite frontend and Node server.
6. validates the Worker and static-assets configuration with a Wrangler dry-run.
7. Creates a SHA-256 manifest and uploads the verified build artifact.
8. Deploys only after every verification step passes.
9. Verifies the live frontend, an SPA route, API health, JSON routing, and CORS.

A failed verification, build, deployment, or critical smoke test fails the workflow. Failed checks prevent deployment.

Pull requests run the same verification and build job, but never deploy production.

## One-click manual release

No local terminal is required for a standard release:

1. Open the repository on GitHub.
2. Select **Actions**.
3. Select **ZANA Production CI/CD**.
4. Select **Run workflow**.
5. Select the `main` branch.
6. Leave **Deploy after successful verification** enabled and run the workflow.

Set `deploy` to false when only a fresh verification build is required.

## Required GitHub configuration

Create these GitHub Actions secrets in **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare token should be scoped to the intended account and use the minimum Worker deployment permissions required for `zana-api-worker` and its static assets. It does not need access to unrelated Cloudflare resources.

Create this repository variable when the production API URL differs from the checked-in default:

- `VITE_API_BASE_URL`

Optional repository variable:

- `ZANA_PRODUCTION_URL`

Both URLs are public configuration, not secrets. The default is:

`https://zana-api-worker.zana-platform.workers.dev`

## Cloudflare runtime secrets

Runtime secrets are configured on the Cloudflare Worker and must never be added to GitHub build variables, frontend environment variables, source code, or artifacts. The current runtime secret is:

- `GEMINI_API_KEY`

Optional model overrides supported by the Worker are:

- `GEMINI_PRIMARY_MODEL`
- `GEMINI_VISION_MODEL`

## Build artifact integrity

The verification job uploads `zana-production-build`, containing the compiled client, compiled server, Wrangler dry-run output, and a SHA-256 manifest. The deploy job downloads the same artifact and validates every hash before deployment. It also checks out the exact same commit SHA that passed verification.

The artifact is retained for seven days and never contains `node_modules`, `.env` files, runtime secrets, or local logs.

## Logs and failed runs

Open **GitHub → Actions → ZANA Production CI/CD**, select a run, and expand the failed job and step. Secret values are provided through the GitHub secrets context and must not be printed.

To rerun a transient failure, use **Re-run failed jobs**. If source or configuration changed, commit the correction to `main`; the new commit starts a new verified release automatically.

## Rollback

Use GitHub's web interface to revert the faulty commit on `main`. Merging or committing that revert triggers the full verification and deployment pipeline, producing a traceable rollback release without a local terminal.

For an urgent Cloudflare-side rollback, use **Cloudflare Dashboard → Workers & Pages → zana-api-worker → Deployments**, select the last verified deployment, and roll it back. Follow it with a Git revert so repository state and production state remain aligned.

## Prevent duplicate deployments

GitHub Actions is the only authoritative deployment system. If Cloudflare Git integration is connected, disable its automatic builds once:

**Cloudflare → Workers & Pages → zana-api-worker → Settings → Build → Disconnect Git repository**, or disable automatic production builds.

This dashboard action cannot be enforced from repository code. Keeping both systems enabled can deploy the same commit twice.
