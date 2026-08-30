export interface RateLimitKVStore {
  get: (key: string, type?: string) => Promise<string | Record<string, unknown> | null>;
  put: (key: string, val: string, options?: { expirationTtl?: number }) => Promise<void>;
}

export interface RateLimitEnvLike {
  LEARNING_RECORDS_KV?: RateLimitKVStore;
  [key: string]: unknown;
}

export async function enforceAiRateLimit(
  env: RateLimitEnvLike | Record<string, unknown> | undefined,
  studentId: string
): Promise<void> {
  const windowSeconds = 3600; // 1 Hour
  const maxRequests = 50; // Pilot limit per student per hour

  const key = `ratelimit:${studentId}`;

  const kv = (env as RateLimitEnvLike | undefined)?.LEARNING_RECORDS_KV;
  if (!kv) {
    return;
  }

  // KV get is fast enough at edge for pilot scale
  const currentUsageData = await kv.get(key);
  const count = typeof currentUsageData === 'string' ? parseInt(currentUsageData, 10) : 0;

  if (count >= maxRequests) {
    console.warn(`[Rate Limit Exceeded] Student: ${studentId}`);
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  // Increment and set TTL. Note: In a high-concurrency production V2, this should move to Durable Objects or Cloudflare Rate Limiting natively.
  await kv.put(key, (count + 1).toString(), { expirationTtl: windowSeconds });
}
