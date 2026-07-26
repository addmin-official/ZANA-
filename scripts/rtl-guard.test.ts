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

test("document and navigation are RTL and mobile safe", async () => {
  const html = await read("index.html");
  const navigation = await read("src/components/BottomNavigation.tsx");

  assert.match(html, /<html[^>]+dir="rtl"/);
  assert.match(navigation, /dir="rtl"/);
  assert.match(navigation, /env\(safe-area-inset-bottom\)/);
  assert.match(navigation, /aria-label=/);
  assert.match(navigation, /aria-current=/);
  assert.match(navigation, /min-h-12/);
  assert.match(navigation, /min-w-11/);
  assert.match(navigation, /min-\[400px\]:inline/);
});

test("shared demo identity cannot return", async () => {
  const sourceFiles = (await listFiles("src")).filter((file) => /\.(?:ts|tsx)$/.test(file));
  const offenders: string[] = [];
  for (const file of sourceFiles) {
    const content = await read(file);
    if (content.includes("student_demo")) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `Shared demo identity found in: ${offenders.join(", ")}`);
});

test("canonical Kurdish spelling is enforced", async () => {
  const sourceFiles = (await listFiles("src")).filter((file) => /\.(?:ts|tsx)$/.test(file));
  const offenders: string[] = [];
  for (const file of sourceFiles) {
    const content = await read(file);
    if (content.includes("کەموکوڕی") || content.includes("کەم و کوڕی")) {
      offenders.push(file);
    }
  }
  assert.deepEqual(offenders, [], `Non-canonical Kurdish spelling found in: ${offenders.join(", ")}`);
});
