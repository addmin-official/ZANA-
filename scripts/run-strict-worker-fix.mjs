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

let executableSource = source.replace(originalHelper, normalizedHelper);
const planningLabelIndex = executableSource.indexOf('"planning preferences parsing"');
if (planningLabelIndex < 0) {
  throw new Error("Unable to locate the optional planning patch section");
}
const planningStart = executableSource.lastIndexOf("worker = replaceOnce(", planningLabelIndex);
const finalWrite = executableSource.indexOf("write(workerPath, worker);", planningLabelIndex);
if (planningStart < 0 || finalWrite < 0) {
  throw new Error("Unable to isolate the verified Worker route patches");
}
executableSource = executableSource.slice(0, planningStart) + executableSource.slice(finalWrite);

const temporaryPath = path.resolve(".tmp-apply-strict-worker-fix.mjs");
fs.writeFileSync(temporaryPath, executableSource, "utf8");
try {
  await import(`${pathToFileURL(temporaryPath).href}?run=${Date.now()}`);
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
