import { existsSync, readFileSync } from 'node:fs';

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`Required file is missing: ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function requireMatch(value, pattern, message) {
  if (!pattern.test(value)) failures.push(message);
}

function forbidMatch(value, pattern, message) {
  if (pattern.test(value)) failures.push(message);
}

const pkgText = read('package.json');
const wrangler = read('wrangler.jsonc');
const workflow = read('.github/workflows/ci.yml');
const models = read('src/server/config/aiModels.ts');
const worker = read('src/worker/index.ts');
const provider = read('src/server/ai/GeminiProvider.ts');
const smoke = read('scripts/smoke-test.js');

let pkg = {};
try {
  pkg = JSON.parse(pkgText);
} catch {
  failures.push('package.json is not valid JSON.');
}

// Production architecture contract.
requireMatch(wrangler, /"name"\s*:\s*"zana-api-worker"/, 'Cloudflare Worker name changed from zana-api-worker.');
requireMatch(wrangler, /"main"\s*:\s*"src\/worker\/index\.ts"/, 'Cloudflare Worker entrypoint must remain src/worker/index.ts.');
requireMatch(wrangler, /"directory"\s*:\s*"\.\/dist\/client"/, 'Static Assets must remain bound to ./dist/client.');
requireMatch(wrangler, /https:\/\/zana\.krd/, 'Canonical frontend origin https://zana.krd is missing from Wrangler configuration.');
forbidMatch(wrangler, /localhost|127\.0\.0\.1|\.web\.app|firebaseapp\.com/i, 'Production Wrangler configuration contains localhost, emulator, or Firebase Hosting routing.');

// Canonical Gemini contract.
requireMatch(models, /primaryModel\s*:\s*"gemini-3\.5-flash"/, 'Primary Gemini model changed from gemini-3.5-flash.');
requireMatch(models, /visionModel\s*:\s*"gemini-3\.5-flash"/, 'Vision Gemini model changed from gemini-3.5-flash.');
requireMatch(provider, /new GoogleGenAI\s*\(\s*\{\s*apiKey:/s, 'Gemini provider no longer initializes GoogleGenAI with an API key.');
requireMatch(provider, /ai\.models\.generateContent\s*\(/, 'Gemini provider no longer uses models.generateContent.');
requireMatch(worker, /GEMINI_API_KEY\s*:\s*string/, 'Worker GEMINI_API_KEY binding contract is missing.');
requireMatch(worker, /PROVIDER_PREFLIGHT_TOKEN\??\s*:\s*string/, 'Worker provider preflight token binding contract is missing.');

// Deployment separation and mandatory quality gates.
const scripts = pkg.scripts || {};
for (const [name, command] of Object.entries(scripts)) {
  if (typeof command === 'string' && /firebase\s+deploy|hosting:|functions:/i.test(command)) {
    failures.push(`Forbidden Firebase Hosting/Functions deployment command in npm script ${name}.`);
  }
}
requireMatch(workflow, /npm run lint/, 'CI lint gate is missing.');
requireMatch(workflow, /npm run typecheck/, 'CI TypeScript gate is missing.');
requireMatch(workflow, /npm test/, 'CI test gate is missing.');
requireMatch(workflow, /npm run test:smoke/, 'Production smoke-test gate is missing.');
requireMatch(workflow, /Verify Production Exposure Security/, 'Production security exposure gate is missing.');
requireMatch(workflow, /Generate Release Tag & Metadata/, 'Release metadata gate is missing.');
requireMatch(workflow, /wrangler deploy --config wrangler\.production\.json/, 'Production deployment must use Wrangler and wrangler.production.json.');
forbidMatch(workflow, /firebase\s+deploy|hosting:|functions:/i, 'CI contains a forbidden Firebase Hosting or Functions deployment.');

// Valid AI routes must stay real production checks expecting HTTP 200.
const validRoutes = [
  '/api/chat',
  '/api/assessment',
  '/api/report',
  '/api/study/ask',
  '/api/study/vision',
];
for (const route of validRoutes) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  requireMatch(smoke, new RegExp(`runSmokeAndCorsTest\\([\\s\\S]{0,500}${escaped}[\\s\\S]{0,1200}\\}, 200\\)`), `Smoke test for valid route ${route} is missing or no longer requires HTTP 200.`);
}

// Correct negative contracts must not be weakened.
requireMatch(smoke, /Missing payload[\s\S]{0,800}\}, 400\)/, 'Missing-payload smoke contract must remain HTTP 400.');
requireMatch(smoke, /Oversized 6MB payload[\s\S]{0,1200}\}, 413\)/, 'Oversized-image smoke contract must remain HTTP 413.');
requireMatch(smoke, /Unsupported signature[\s\S]{0,1200}\}, 415\)/, 'Unsupported-image smoke contract must remain HTTP 415.');
requireMatch(smoke, /https:\/\/unauthorized\.example/, 'Unauthorized CORS-origin regression check is missing.');
forbidMatch(smoke, /expectedStatus\s*===?\s*500|\[\s*200\s*,\s*500\s*\]/, 'Smoke tests were weakened to accept HTTP 500.');

if (failures.length > 0) {
  console.error('\nZANA finalization contract FAILED:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('ZANA finalization contract passed.');
console.log('Protected: Cloudflare architecture, Firebase separation, Gemini model/provider, CORS, AI route status contracts, security gates, and release gates.');
