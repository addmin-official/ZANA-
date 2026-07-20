<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/61fd6b5f-d052-40d1-8657-de471d642e8c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Production CI/CD

ZANA releases through the **ZANA Production CI/CD** GitHub Actions workflow to one Cloudflare Worker with static assets. Every release runs locked dependency installation, TypeScript checks, tests, all builds, artifact integrity validation, deployment, and non-destructive live smoke tests.

Firebase authentication and profile synchronization remain supported, but Firebase Hosting is not a production deployment target. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the one-time KV binding, secrets, one-click release, and rollback instructions.
