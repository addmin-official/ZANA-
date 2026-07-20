import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID?.trim();

if (!namespaceId) {
  console.error("::error::Missing GitHub Actions variable CLOUDFLARE_KV_NAMESPACE_ID. Create the production KV namespace in Cloudflare, then add its ID under GitHub Settings > Secrets and variables > Actions > Variables.");
  process.exit(1);
}

if (!/^[a-f0-9]{32}$/i.test(namespaceId)) {
  console.error("::error::CLOUDFLARE_KV_NAMESPACE_ID must be a 32-character Cloudflare namespace ID.");
  process.exit(1);
}

const sourcePath = resolve("wrangler.jsonc");
const outputDirectory = resolve(".wrangler");
const outputPath = resolve(outputDirectory, "production.jsonc");
const config = JSON.parse(readFileSync(sourcePath, "utf8"));

config.kv_namespaces = [{ binding: "LEARNING_RECORDS_KV", id: namespaceId }];
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });

console.log("Production Wrangler configuration generated with the required KV binding.");
