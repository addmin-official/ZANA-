const API_BASE_URL = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL;
const FRONTEND_ORIGIN = process.env.ZANA_FRONTEND_ORIGIN || process.env.FRONTEND_ORIGIN || 'https://zana-app.web.app';

if (!API_BASE_URL) {
  console.error('::error::API_BASE_URL or VITE_API_BASE_URL must be specified.');
  process.exit(1);
}

const baseUrl = API_BASE_URL.replace(/\/$/, '');

async function runTest(name, path, options, expectedStatus) {
  console.log(`\n--- Test: ${name} ---`);
  let passed = true;

  const authorizedHeaders = { Origin: FRONTEND_ORIGIN, ...(options.headers || {}) };
  if (options.method === 'POST' && !(options.body instanceof FormData) && !authorizedHeaders['Content-Type']) {
    authorizedHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers: authorizedHeaders });
    const body = await response.text();
    const allowOrigin = response.headers.get('access-control-allow-origin');

    console.log(`[Authorized] Status: ${response.status}`);
    console.log('[Authorized] Body Excerpt:', body.slice(0, 200));

    if (response.status !== expectedStatus) {
      console.error(`::error::${name}: received ${response.status}; expected ${expectedStatus}.`);
      passed = false;
    }
    if (allowOrigin !== FRONTEND_ORIGIN) {
      console.error(`::error::${name}: invalid CORS origin ${allowOrigin}.`);
      passed = false;
    }

    if (path === '/api/health' && response.status === 200) {
      try {
        const data = JSON.parse(body);
        if (data.status !== 'ok' || data.service !== 'zana-api-worker') {
          console.error(`::error::${name}: invalid health response.`);
          passed = false;
        }
      } catch {
        console.error(`::error::${name}: health response was not JSON.`);
        passed = false;
      }
    }
  } catch (error) {
    console.error(`::error::${name}: request failed:`, error);
    passed = false;
  }

  const unauthorizedHeaders = { Origin: 'https://unauthorized.example', ...(options.headers || {}) };
  if (options.method === 'POST' && !(options.body instanceof FormData) && !unauthorizedHeaders['Content-Type']) {
    unauthorizedHeaders['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers: unauthorizedHeaders });
    const allowOrigin = response.headers.get('access-control-allow-origin');
    if (allowOrigin === '*' || allowOrigin === 'https://unauthorized.example') {
      console.error(`::error::${name}: unauthorized origin was allowed.`);
      passed = false;
    }
  } catch (error) {
    console.error(`::error::${name}: unauthorized-origin check failed:`, error);
    passed = false;
  }

  return passed;
}

async function main() {
  console.log(`Running non-destructive production smoke tests against: ${baseUrl}`);
  let passed = true;

  const tests = [
    ['GET /api/health', '/api/health', { method: 'GET' }, 200],
    ['POST /api/chat rejects missing payload', '/api/chat', { method: 'POST', body: '{}' }, 400],
    ['POST /api/assessment rejects missing payload', '/api/assessment', { method: 'POST', body: '{}' }, 400],
    ['POST /api/report rejects missing payload', '/api/report', { method: 'POST', body: '{}' }, 400],
    ['POST /api/study/ask rejects missing payload', '/api/study/ask', { method: 'POST', body: '{}' }, 400],
    ['Unknown API route returns JSON 404', '/api/__smoke_not_found__', { method: 'GET' }, 404]
  ];

  for (const test of tests) {
    if (!(await runTest(...test))) passed = false;
  }

  const missingImage = new FormData();
  missingImage.append('mode', 'explain');
  if (!(await runTest('Vision rejects missing image', '/api/study/vision', { method: 'POST', body: missingImage }, 400))) passed = false;

  const hugeBuffer = new Uint8Array(6 * 1024 * 1024);
  hugeBuffer.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const oversized = new FormData();
  oversized.append('image', new Blob([hugeBuffer], { type: 'image/png' }), 'huge.png');
  oversized.append('context', '{}');
  if (!(await runTest('Vision rejects oversized image', '/api/study/vision', { method: 'POST', body: oversized }, 413))) passed = false;

  const invalidFile = new FormData();
  invalidFile.append('image', new Blob([new Uint8Array(8)], { type: 'image/png' }), 'invalid.png');
  invalidFile.append('context', '{}');
  if (!(await runTest('Vision rejects unsupported signature', '/api/study/vision', { method: 'POST', body: invalidFile }, 415))) passed = false;

  if (!passed) {
    console.error('\n❌ Production smoke tests FAILED.');
    process.exit(1);
  }

  console.log('\n✅ All non-destructive production smoke tests passed.');
}

main().catch((error) => {
  console.error('::error::Production smoke test exception:', error);
  process.exit(1);
});
