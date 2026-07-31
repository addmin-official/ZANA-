// scripts/check-secrets.js
const required = [
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'GEMINI_API_KEY',
  'PROVIDER_PREFLIGHT_TOKEN',
  'VITE_API_BASE_URL'
];

let missing = false;
for (const secret of required) {
  if (!process.env[secret]) {
    console.error(`::error::Missing mandatory production secret: ${secret}`);
    missing = true;
  }
}

if (missing) {
  process.exit(1);
}
