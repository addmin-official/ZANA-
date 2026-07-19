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

ZANA production releases are verified and deployed exclusively through the **ZANA Production CI/CD** GitHub Actions workflow. Every push to `main` installs the locked npm dependencies, runs lint, TypeScript checks and tests, builds the application, validates Wrangler, deploys the Worker and static assets, and runs non-destructive production smoke tests.

For a one-click redeploy, open **GitHub → Actions → ZANA Production CI/CD → Run workflow**, leave `deploy` enabled, and run the workflow. Standard production releases do not require a local terminal. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for setup, rollback, and troubleshooting.
