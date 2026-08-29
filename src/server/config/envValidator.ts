export function validateProductionEnv(env: Record<string, unknown> | object): void {
  const envObj = env as Record<string, unknown>;
  const requiredKeys = ['GEMINI_API_KEY', 'GEMINI_PRIMARY_MODEL', 'ADMIN_TELEMETRY_SECRET'];

  const missingKeys = requiredKeys.filter((key) => !envObj[key]);
  if (missingKeys.length > 0) {
    throw new Error(`[FATAL] Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  if (!envObj.LEARNING_RECORDS_KV) {
    throw new Error(`[FATAL] LEARNING_RECORDS_KV binding is missing.`);
  }
}
