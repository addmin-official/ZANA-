export interface TelemetryExportEnv {
  ADMIN_TELEMETRY_SECRET?: string;
  LEARNING_RECORDS_KV?: {
    list: (options?: { prefix?: string }) => Promise<{ keys: { name: string }[] }>;
    get: (key: string, type?: 'json' | 'text') => Promise<unknown>;
  };
  [key: string]: unknown;
}

export async function handleTelemetryExportRoute(
  request: Request,
  env: TelemetryExportEnv | Record<string, unknown>
): Promise<Response> {
  // Strict Machine-to-Machine / Admin authentication (Do NOT use student Firebase tokens here)
  const authHeader = request.headers.get('Authorization');
  const secret = (env as TelemetryExportEnv)?.ADMIN_TELEMETRY_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const kv = (env as TelemetryExportEnv)?.LEARNING_RECORDS_KV;
    if (!kv) {
      return new Response(
        JSON.stringify({
          success: true,
          count: 0,
          data: [],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Note: list() has a limit of 1000 keys per request. Sufficient for pilot monitoring.
    const listed = await kv.list({ prefix: 'feedback:' });

    const records: Array<Record<string, unknown>> = [];
    for (const key of listed.keys) {
      const data = (await kv.get(key.name, 'json')) as Record<string, unknown> | null;
      if (data) {
        records.push(data);
      }
    }

    // Sort chronologically descending
    records.sort((a, b) => {
      const timeA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0;
      const timeB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0;
      return timeB - timeA;
    });

    return new Response(
      JSON.stringify({
        success: true,
        count: records.length,
        data: records,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error(`[Telemetry Export Fatal]`, error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
