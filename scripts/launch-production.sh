#!/bin/bash
set -e

echo "🚀 INITIATING ZANA STAGE A PRODUCTION LAUNCH..."
echo "1/4 Running Linter..."
npm run lint
echo "2/4 Running Typecheck..."
npm run typecheck
echo "3/4 Executing Test Suites..."
npm test
echo "4/4 Deploying to Cloudflare Production Edge..."
npx wrangler deploy --env production
echo "✅ ZANA STAGE A IS LIVE."
