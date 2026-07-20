import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const requireBuild = process.argv.includes("--require-build");
const failures = [];
const requireFile = (path, description) => {
  if (!existsSync(resolve(root, path))) failures.push(`${description} is missing: ${path}`);
};
const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(resolve(root, path), "utf8"));
  } catch (error) {
    failures.push(`${path} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
};

const packageJson = readJson("package.json");
const lockfile = readJson("package-lock.json");
const rootLockPackage = lockfile.packages?.[""] || {};
for (const section of ["dependencies", "devDependencies"]) {
  if (JSON.stringify(packageJson[section] || {}) !== JSON.stringify(rootLockPackage[section] || {})) {
    failures.push(`package-lock.json ${section} is not synchronized with package.json`);
  }
}

requireFile("src/worker/index.ts", "Cloudflare Worker entry point");
requireFile("wrangler.jsonc", "Cloudflare configuration");
requireFile("scripts/configure-wrangler.mjs", "production binding generator");

const wranglerText = readFileSync(resolve(root, "wrangler.jsonc"), "utf8");
for (const setting of [
  '"name": "zana-api-worker"',
  '"main": "src/worker/index.ts"',
  '"directory": "./dist/client"',
  '"not_found_handling": "single-page-application"',
  '"binding": "LEARNING_RECORDS_KV"',
  '"/api/*"',
]) {
  if (!wranglerText.includes(setting)) failures.push(`wrangler.jsonc is missing required setting: ${setting}`);
}

for (const path of ["package.json", ".github/workflows/ci.yml", "wrangler.jsonc"]) {
  const content = readFileSync(resolve(root, path), "utf8");
  if (/firebase\s+deploy|FIREBASE_SERVICE_ACCOUNT|firebase:deploy/i.test(content)) {
    failures.push(`${path} contains obsolete Firebase Hosting deployment infrastructure`);
  }
  if (/\bbun\s+(install|run)|bun\.lock/i.test(content)) failures.push(`${path} contains obsolete Bun infrastructure`);
}
if (existsSync(resolve(root, "bun.lock")) || existsSync(resolve(root, "bun.lockb"))) failures.push("an obsolete Bun lockfile is present");

if (requireBuild) {
  requireFile("dist/client/index.html", "Vite static-assets entry point");
  requireFile("dist/server/server.cjs", "compiled server entry point");
  requireFile("dist/worker/index.js", "compiled Cloudflare Worker entry point");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`::error::${failure}`));
  process.exit(1);
}
console.log(`Production validation passed${requireBuild ? " with build outputs" : ""}.`);
