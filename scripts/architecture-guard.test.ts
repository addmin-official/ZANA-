import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

async function read(relativePath: string): Promise<string> {
  return readFile(path.join(root, relativePath), "utf8");
}

async function listFiles(directory: string): Promise<string[]> {
  const absoluteDirectory = path.join(root, directory);
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFiles(relative));
    } else {
      files.push(relative);
    }
  }
  return files;
}

test("production architecture excludes Firebase Hosting and Functions", async () => {
  const firebaseConfig = JSON.parse(await read("firebase.json")) as Record<string, unknown>;
  assert.equal("hosting" in firebaseConfig, false, "Firebase Hosting configuration is forbidden");
  assert.equal("functions" in firebaseConfig, false, "Firebase Functions configuration is forbidden");

  const packageJson = JSON.parse(await read("package.json")) as {
    scripts?: Record<string, string>;
  };
  const scripts = Object.values(packageJson.scripts ?? {}).join("\n");
  assert.doesNotMatch(scripts, /firebase\s+deploy/i);
  assert.doesNotMatch(scripts, /dist\/server\.cjs/i);
  assert.doesNotMatch(scripts, /build:server/i);
  assert.doesNotMatch(packageJson.scripts?.["build:worker"] ?? "", /^echo\b/i);
});

test("production configuration contains no emulator or legacy Hosting routing", async () => {
  const files = [
    "wrangler.jsonc",
    ".github/workflows/ci.yml",
    "src/worker/index.ts",
  ];
  const combined = (await Promise.all(files.map(read))).join("\n");

  assert.doesNotMatch(combined, /FIRESTORE_EMULATOR_HOST|FIREBASE_AUTH_EMULATOR_HOST/i);
  assert.doesNotMatch(combined, /https?:\/\/(?:localhost|127\.0\.0\.1)/i);
  assert.doesNotMatch(combined, /https:\/\/[^\s"']+\.(?:web\.app|firebaseapp\.com)/i);
});

test("Gemini SDK is imported only by the canonical provider", async () => {
  const sourceFiles = (await listFiles("src"))
    .filter((file) => /\.(?:ts|tsx)$/.test(file))
    .filter((file) => !/\.test\.(?:ts|tsx)$/.test(file));

  const offenders: string[] = [];
  for (const file of sourceFiles) {
    if (file === "src/server/ai/GeminiProvider.ts") continue;
    const content = await read(file);
    if (content.includes("@google/genai") || content.includes("GoogleGenAI")) {
      offenders.push(file);
    }
  }

  assert.deepEqual(offenders, [], `Duplicate Gemini runtime found in: ${offenders.join(", ")}`);
});

test("local storage cannot restore server authority", async () => {
  const storage = await read("src/features/student/studentStorage.ts");
  assert.match(storage, /authoritative:\s*false/);
  assert.match(storage, /source:\s*"guest-local"/);
  assert.doesNotMatch(storage, /rawObject\.(?:authoritative|source|isStale)/);
  assert.doesNotMatch(storage, /rawObj\s+as\s+any/);
});

test("official Firestore learning writes are denied", async () => {
  const rules = await read("firestore.rules");
  for (const collection of ["mastery", "attempts", "sessions", "planning", "assessments"]) {
    const pattern = new RegExp(`match \\/${collection}\\/\\{[^}]+\\}[\\s\\S]*?allow write:\\s*if false;`);
    assert.match(rules, pattern, `${collection} must be read-only to clients`);
  }
});
