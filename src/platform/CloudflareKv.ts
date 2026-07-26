export interface CloudflareKvListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface CloudflareKvListKey {
  name: string;
  expiration?: number;
  metadata?: unknown;
}

export interface CloudflareKvListResult {
  keys: CloudflareKvListKey[];
  list_complete?: boolean;
  cursor?: string;
}

/**
 * Minimal, runtime-portable shape shared by every ZANA Cloudflare KV provider.
 * Keeping this interface in one module prevents provider-specific binding types
 * from drifting apart and avoids importing Worker-only globals into React code.
 */
export interface CloudflareKvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  list(options?: CloudflareKvListOptions): Promise<CloudflareKvListResult>;
}

export function isCloudflareKvNamespace(value: unknown): value is CloudflareKvNamespace {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.get === "function" &&
    typeof candidate.put === "function" &&
    typeof candidate.list === "function"
  );
}

export function requireCloudflareKvNamespace(
  value: unknown,
  bindingName: string
): CloudflareKvNamespace {
  if (!isCloudflareKvNamespace(value)) {
    throw new Error(
      `CRITICAL CONFIGURATION ERROR: Cloudflare KV binding ${bindingName} is missing or invalid. ZANA is failing closed.`
    );
  }
  return value;
}
