import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = "scripts/apply-strict-worker-fix.mjs";
const source = fs.readFileSync(sourcePath, "utf8");
const originalHelper = `function replaceSection(content, pattern, replacement, label) {
  const matches = content.match(pattern);
  if (!matches || matches.length !== 1) {
    throw new Error(\`Expected exactly one section for \${label}\`);
  }
  return content.replace(pattern, replacement);
}`;
const normalizedHelper = `function replaceSection(content, pattern, replacement, label) {
  const normalizedPattern = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  const matches = content.match(normalizedPattern);
  if (!matches || matches.length !== 1) {
    throw new Error(\`Expected exactly one section for \${label}\`);
  }
  return content.replace(normalizedPattern, replacement);
}`;

if (!source.includes(originalHelper)) {
  throw new Error("Unable to normalize the strict Worker patch helper");
}

const temporaryPath = path.resolve(".tmp-apply-strict-worker-fix.mjs");
fs.writeFileSync(temporaryPath, source.replace(originalHelper, normalizedHelper), "utf8");
try {
  await import(`${pathToFileURL(temporaryPath).href}?run=${Date.now()}`);
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
