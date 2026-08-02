import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
const firebaseJsonPath = path.join(PROJECT_ROOT, 'firebase.json');

console.log("Verifying ZANA Finalization Contract...");

if (!packageJson.scripts['deploy']?.includes('wrangler')) {
  console.error("❌ Architecture violation: deploy script must use wrangler");
  process.exit(1);
}

if (!packageJson.scripts['build:client']?.includes('vite build')) {
  console.error("❌ Architecture violation: build:client must use vite build");
  process.exit(1);
}

if (fs.existsSync(firebaseJsonPath)) {
  const firebaseJson = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
  if (firebaseJson.hosting || firebaseJson.functions) {
    console.error("❌ Architecture violation: Firebase Hosting or Functions detected. We use Cloudflare Workers and Pages.");
    process.exit(1);
  }
}

const workerIndex = fs.readFileSync(path.join(PROJECT_ROOT, 'src/worker/index.ts'), 'utf8');
if (workerIndex.includes('http://localhost') || workerIndex.includes('127.0.0.1')) {
  console.error("❌ Architecture violation: localhost routing detected in production worker");
  process.exit(1);
}

console.log("✅ Finalization Contract verified.");
