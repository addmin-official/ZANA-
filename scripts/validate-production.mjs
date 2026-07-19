import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const requireBuild = process.argv.includes("--require-build");
const failures = [];

function requireFile(relativePath, description) {
  if (!existsSync(resolve(root, relativePath))) {
    failures.push(`${description} is missing: ${relativePath}`);
  }
}

function readJson(relativePath) {
  try {
    return JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
  } catch (error) {
    failures.push(`${relativePath} is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return {};
  }
}

const packageJson = readJson("package.json");
const lockfile = readJson("package-lock.json");
const rootLockPackage = lockfile.packages?.[""] || {};

for (const section of ["dependencies", "devDependencies"]) {
  const expected = packageJson[section] || {};
  const locked = rootLockPackage[section] || {};
  if (JSON.stringify(expected) !== JSON.stringify(locked)) {
    failures.push(`package-lock.json ${section} is not synchronized with package.json`);
  }
}

requireFile("src/worker/index.ts", "Cloudflare Worker entry point");
requireFile("wrangler.jsonc", "Cloudflare configuration");

const wranglerText = readFileSync(resolve(root, "wrangler.jsonc"), "utf8");
for (const requiredSetting of [
  '"name": "zana-api-worker"',
  '"main": "src/worker/index.ts"',
  '"directory": "./dist/client"',
  '"not_found_handling": "single-page-application"',
  '"/api/*"',
]) {
  if (!wranglerText.includes(requiredSetting)) {
    failures.push(`wrangler.jsonc is missing required setting: ${requiredSetting}`);
  }
}

const deploymentFiles = ["package.json", ".github/workflows/ci.yml", "wrangler.jsonc"];
for (const relativePath of deploymentFiles) {
  const content = readFileSync(resolve(root, relativePath), "utf8");
  if (/firebase\s+deploy|FIREBASE_SERVICE_ACCOUNT|firebase:deploy/i.test(content)) {
    failures.push(`${relativePath} contains obsolete Firebase deployment infrastructure`);
  }
  if (/\bbun\s+(install|run)|bun\.lock/i.test(content)) {
    failures.push(`${relativePath} contains obsolete Bun deployment infrastructure`);
  }
}

if (existsSync(resolve(root, "bun.lock")) || existsSync(resolve(root, "bun.lockb"))) {
  failures.push("an obsolete Bun lockfile is present");
}

if (requireBuild) {
  requireFile("dist/client/index.html", "Vite static-assets entry point");
  requireFile("dist/server/server.cjs", "compiled server entry point");
  requireFile("dist/worker/index.js", "compiled Cloudflare Worker entry point");
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`::error::${failure}`);
  }
  process.exit(1);
}

console.log(`Production validation passed${requireBuild ? " with build outputs" : ""}.`);
