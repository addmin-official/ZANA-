export function reportClientError(error: Error, componentStack?: string) {
  // In a full production environment, this would route to Sentry, DataDog, or GCP Cloud Logging.
  // For the Beta pilot, we will log structurally to the console and could optionally POST to a new Worker telemetry endpoint.

  const payload = {
    message: error.message,
    name: error.name,
    stack: error.stack,
    componentStack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timestamp: new Date().toISOString(),
  };

  console.error('[ZANA Telemetry] Unhandled Exception:', JSON.stringify(payload, null, 2));

  // Placeholder for HTTP beacon
  // fetch('/api/telemetry/error', { method: 'POST', body: JSON.stringify(payload) }).catch(() => {});
}
