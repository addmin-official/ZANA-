# ZANA Production Deployment

ZANA has one authoritative production path:

> GitHub Actions → Wrangler → Cloudflare Worker and Static Assets

Firebase remains a client-side identity/profile data provider. Firebase Hosting and Bun are not production deployment systems.

## Required one-time configuration

In Cloudflare, create a KV namespace for persistent adaptive-learning records. Copy its 32-character namespace ID.

In **GitHub → Settings → Secrets and variables → Actions** configure:

- Secret `CLOUDFLARE_API_TOKEN`
- Secret `CLOUDFLARE_ACCOUNT_ID`
- Variable `CLOUDFLARE_KV_NAMESPACE_ID`

The Cloudflare token needs only Worker deployment access because the workflow binds an already-created namespace; it never creates storage implicitly. The namespace ID is public configuration, not a secret.

Optional repository variables:

- `VITE_API_BASE_URL`
- `ZANA_PRODUCTION_URL`

Both default to `https://zana-api-worker.zana-platform.workers.dev`.

## Verified releases

Every push to `main` installs the locked npm dependencies, runs production configuration validation, TypeScript checks, tests, client/server/Worker builds, and artifact integrity checks. Only that exact verified artifact is deployed. Production smoke tests then verify the frontend, SPA routing, API health, JSON route isolation, and CORS without calling Gemini or changing student data.

Pull requests execute verification but never deploy. For a one-click release, open **Actions → ZANA Production CI/CD → Run workflow** on `main` and leave deployment enabled.

## Runtime secrets

Configure Worker runtime secrets in Cloudflare, never in source or frontend variables:

- `GEMINI_API_KEY`
- `JWT_SECRET` when authentication endpoints are enabled
- Optional `GEMINI_PRIMARY_MODEL`
- Optional `GEMINI_VISION_MODEL`

## Rollback and duplicate deployments

Use GitHub's web interface to revert the faulty commit; that revert is fully verified and deployed. For an emergency rollback, select the last verified version under **Cloudflare → Workers & Pages → zana-api-worker → Deployments**, then follow it with a Git revert.

GitHub Actions is authoritative. Disable Cloudflare's Git-connected automatic build under **Worker Settings → Build → Disconnect Git repository** to prevent duplicate deployments.
