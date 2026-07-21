// Deterministic KV Namespace Resolver for Cloudflare Workers
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "path";

function runCmd(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (err) {
    console.error(`Command failed: ${cmd}`);
    console.error(`Stdout: ${err.stdout}`);
    console.error(`Stderr: ${err.stderr}`);
    throw err;
  }
}

function parseWranglerJsonc(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  // Basic JSONC comment stripping (since wrangler.jsonc might contain comments)
  const cleaned = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
  return JSON.parse(cleaned);
}

function main() {
  const wranglerConfigPath = path.resolve("wrangler.jsonc");
  const productionConfigPath = path.resolve("wrangler.production.json");
  
  if (!fs.existsSync(wranglerConfigPath)) {
    console.error(`Error: wrangler.jsonc not found at ${wranglerConfigPath}`);
    process.exit(1);
  }

  const baseConfig = parseWranglerJsonc(wranglerConfigPath);
  const workerName = baseConfig.name || "zana-api-worker";
  const canonicalTitle = `${workerName}-LEARNING_RECORDS_KV`;

  console.log(`Resolving KV Namespace deterministically for worker '${workerName}'...`);
  console.log(`Canonical namespace title: '${canonicalTitle}'`);

  let resolvedId = null;

  // A. Prefer CLOUDFLARE_KV_NAMESPACE_ID from env when set
  const envKvId = process.env.CLOUDFLARE_KV_NAMESPACE_ID;

  // Fetch list of namespaces to verify/query
  console.log("Listing existing KV namespaces via wrangler...");
  let namespaceList = [];
  try {
    const listJson = runCmd("npx wrangler kv namespace list");
    namespaceList = JSON.parse(listJson);
  } catch (err) {
    console.error("Error: Failed to list KV namespaces. Please check your CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID permissions.");
    process.exit(1);
  }

  if (envKvId) {
    console.log(`Preferred KV namespace ID provided in environment: '${envKvId}'`);
    
    // B. Validate it as exactly 32 hexadecimal characters
    const hex32Regex = /^[0-9a-fA-F]{32}$/;
    if (!hex32Regex.test(envKvId)) {
      console.error(`Error: CLOUDFLARE_KV_NAMESPACE_ID is invalid. Must be exactly 32 hexadecimal characters, got: '${envKvId}'`);
      process.exit(1);
    }
    console.log("Environment KV namespace ID matches exactly 32-hex character validation.");

    // C. Verify that the namespace exists in the configured account
    const matched = namespaceList.find(ns => ns.id === envKvId);
    if (!matched) {
      console.error(`Error: The specified KV namespace ID '${envKvId}' does not exist in the configured Cloudflare account!`);
      process.exit(1);
    }
    
    console.log(`Verified: Namespace ID '${envKvId}' exists with title '${matched.title}'`);
    resolvedId = envKvId;
  } else {
    console.log("No CLOUDFLARE_KV_NAMESPACE_ID provided in environment. Querying by canonical title...");
    
    // D. If unset, query by one exact canonical namespace title
    const matches = namespaceList.filter(ns => ns.title === canonicalTitle);
    
    if (matches.length === 1) {
      // E. Reuse exactly one match
      console.log(`Found exactly one existing matching namespace with title '${canonicalTitle}': ID is '${matches[0].id}'`);
      resolvedId = matches[0].id;
    } else if (matches.length > 1) {
      // G. Fail on ambiguity
      console.error(`Error: Ambiguity detected! Multiple KV namespaces match the title '${canonicalTitle}':`);
      matches.forEach(m => console.error(`  - ID: ${m.id}`));
      process.exit(1);
    } else {
      // F. Explicitly create only when no exact match exists and token permissions permit creation
      console.log(`No existing namespace matches the canonical title '${canonicalTitle}'. Attempting creation...`);
      try {
        const createOutput = runCmd(`npx wrangler kv namespace create LEARNING_RECORDS_KV`);
        console.log("Creation output:\n", createOutput);
        
        // Re-list namespaces to extract the newly created ID
        console.log("Re-listing namespaces after creation...");
        const newListJson = runCmd("npx wrangler kv namespace list");
        const newNamespaceList = JSON.parse(newListJson);
        const newMatch = newNamespaceList.find(ns => ns.title === canonicalTitle);
        
        if (!newMatch) {
          console.error(`Error: Created namespace successfully but could not locate title '${canonicalTitle}' in subsequent list!`);
          process.exit(1);
        }
        
        resolvedId = newMatch.id;
        console.log(`Successfully resolved newly created KV namespace ID: '${resolvedId}'`);
      } catch (err) {
        console.error("Error: Failed to create KV namespace. Your token permissions might not permit creation.");
        process.exit(1);
      }
    }
  }

  // Final validation check of resolved ID
  const finalHex32Regex = /^[0-9a-fA-F]{32}$/;
  if (!resolvedId || !finalHex32Regex.test(resolvedId)) {
    console.error(`Error: Final resolved KV namespace ID is invalid/null: '${resolvedId}'`);
    process.exit(1);
  }

  // Generate wrangler.production.json with verified binding
  console.log(`Generating wrangler.production.json with LEARNING_RECORDS_KV resolved to '${resolvedId}'...`);
  
  const prodConfig = { ...baseConfig };
  prodConfig.kv_namespaces = [
    {
      binding: "LEARNING_RECORDS_KV",
      id: resolvedId
    }
  ];

  // Remove $schema to keep it standard JSON if needed, or keep it
  fs.writeFileSync(productionConfigPath, JSON.stringify(prodConfig, null, 2));
  console.log(`Successfully wrote ${productionConfigPath}`);
}

main();
