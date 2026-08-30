export function applySecurityHeaders(response: Response): Response {
  // Create a new response to allow header mutation
  const secureResponse = new Response(
    response.status === 204 || response.status === 304 ? null : response.body,
    response
  );

  const headers = secureResponse.headers;

  // Prevent MIME-type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');
  // Enforce HTTPS
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Control referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Note: Content-Security-Policy (CSP) is highly restrictive.
  // For Beta, we apply a baseline that allows our Vite frontend, Firebase, and Gemini assets.
  const csp = [
    "default-src 'self'",
    "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'", // Required for some React/Vite dev setups; tighten in strict prod
    "frame-src 'self' https://*.firebaseapp.com",
  ].join('; ');

  headers.set('Content-Security-Policy', csp);

  return secureResponse;
}
