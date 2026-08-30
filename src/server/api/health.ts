export interface HealthEnv {
  LEARNING_RECORDS_KV?: {
    put: (key: string, val: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
  GEMINI_API_KEY?: string;
  [key: string]: unknown;
}

export async function handleHealthRoute(request: Request, env: HealthEnv): Promise<Response> {
  const status = {
    service: 'ZANA API',
    status: 'operational',
    timestamp: new Date().toISOString(),
    dependencies: {
      kv: 'unknown',
      gemini: 'unknown',
    },
  };

  let httpStatus = 200;

  // 1. Check Cloudflare KV Binding
  try {
    if (env.LEARNING_RECORDS_KV) {
      await env.LEARNING_RECORDS_KV.put('health_ping', 'ok', { expirationTtl: 60 });
      status.dependencies.kv = 'operational';
    } else {
      throw new Error('KV binding missing');
    }
  } catch (error) {
    console.error('[Health] KV Error:', error);
    status.dependencies.kv = 'degraded';
    status.status = 'degraded';
    httpStatus = 503;
  }

  // 2. Check Gemini API Connectivity (Lightweight model list ping, no heavy generation)
  try {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY missing');
    }
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const geminiResponse = await fetch(geminiUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (geminiResponse.ok) {
      status.dependencies.gemini = 'operational';
    } else {
      throw new Error(`HTTP ${geminiResponse.status}`);
    }
  } catch (error) {
    console.error('[Health] Gemini API Error:', error);
    status.dependencies.gemini = 'degraded';
    status.status = 'degraded';
    httpStatus = 502; // Bad Gateway for upstream failure
  }

  return new Response(JSON.stringify(status), {
    status: httpStatus,
    headers: { 'Content-Type': 'application/json' },
  });
}
