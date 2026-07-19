import { readFileSync } from 'fs';

const API_BASE_URL = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  console.error("::error::ERROR: API_BASE_URL or VITE_API_BASE_URL must be specified as an environment variable.");
  process.exit(1);
}

console.log(`Running Production Smoke Tests against: ${API_BASE_URL}`);

async function runSmokeAndCorsTest(name, path, options = {}, expectedStatus) {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;
  console.log(`\n--- Test: ${name} (${options.method || 'GET'} ${path}) ---`);

  // Prepare body
  let bodyValue = options.body;

  // 1. Authorized Request
  const authHeaders = {
    'Origin': 'https://zana-app.web.app',
    ...(options.headers || {})
  };
  if (!(bodyValue instanceof FormData) && !authHeaders['Content-Type'] && options.method === 'POST') {
    authHeaders['Content-Type'] = 'application/json';
  }

  let ok = true;
  let responseText = "";

  try {
    const res = await fetch(url, {
      ...options,
      headers: authHeaders,
      body: bodyValue
    });

    responseText = await res.text();
    console.log(`[Authorized] Status: ${res.status}`);
    console.log(`[Authorized] Body Excerpt:`, responseText.slice(0, 200));

    // Verify HTTP Status
    if (res.status !== expectedStatus) {
      console.error(`::error::FAIL: ${name} (Authorized) status was ${res.status} (expected ${expectedStatus}). Response: ${responseText}`);
      ok = false;
    }

    // Verify CORS allowed origin
    const allowOrigin = res.headers.get('access-control-allow-origin');
    console.log(`[Authorized] CORS Header: ${allowOrigin}`);
    if (!allowOrigin) {
      console.error(`::error::FAIL: ${name} (Authorized) is missing Access-Control-Allow-Origin header.`);
      ok = false;
    } else if (allowOrigin === '*') {
      console.error(`::error::FAIL: ${name} (Authorized) returned wildcard CORS header.`);
      ok = false;
    } else if (allowOrigin !== 'https://zana-app.web.app') {
      console.error(`::error::FAIL: ${name} (Authorized) returned incorrect CORS header: ${allowOrigin}`);
      ok = false;
    }
  } catch (err) {
    console.error(`::error::FAIL: ${name} (Authorized) request failed:`, err);
    ok = false;
  }

  // 2. Unauthorized Request (to verify it is not accepted as an allowed origin)
  const unauthHeaders = {
    'Origin': 'https://unauthorized.example',
    ...(options.headers || {})
  };
  if (!(bodyValue instanceof FormData) && !unauthHeaders['Content-Type'] && options.method === 'POST') {
    unauthHeaders['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: unauthHeaders,
      body: bodyValue
    });

    const unauthAllowOrigin = res.headers.get('access-control-allow-origin');
    console.log(`[Unauthorized] CORS Header: ${unauthAllowOrigin}`);
    if (unauthAllowOrigin === 'https://unauthorized.example') {
      console.error(`::error::FAIL: ${name} (Unauthorized) accepted unauthorized origin https://unauthorized.example!`);
      ok = false;
    } else if (unauthAllowOrigin === '*') {
      console.error(`::error::FAIL: ${name} (Unauthorized) returned wildcard CORS header for unauthorized request.`);
      ok = false;
    } else {
      console.log(`[Unauthorized] CORS verification passed (unauthorized origin rejected or handled safely).`);
    }
  } catch (err) {
    console.error(`::error::FAIL: ${name} (Unauthorized) request failed:`, err);
    ok = false;
  }

  return { ok, body: responseText };
}

async function main() {
  let allPassed = true;

  try {
    // 1. GET /api/health
    const healthTest = await runSmokeAndCorsTest("GET /api/health", "/api/health", { method: "GET" }, 200);
    if (!healthTest.ok) {
      allPassed = false;
    } else {
      try {
        const data = JSON.parse(healthTest.body);
        if (data.status !== 'ok' || data.service !== 'zana-api-worker') {
          console.error(`::error::FAIL: GET /api/health response body was invalid: ${healthTest.body}`);
          allPassed = false;
        }
      } catch (e) {
        console.error(`::error::FAIL: GET /api/health returned non-JSON response.`);
        allPassed = false;
      }
    }

    // 2. POST /api/chat (Valid payload)
    const chatOk = await runSmokeAndCorsTest("POST /api/chat (Valid payload)", "/api/chat", {
      method: "POST",
      body: JSON.stringify({
        message: "سڵاو",
        history: [],
        profile: {
          name: "قوتابی",
          grade: "10",
          activeSubject: "math",
          level: "beginner"
        }
      })
    }, 200);
    if (!chatOk.ok) allPassed = false;

    // 3. POST /api/chat (Missing payload)
    const chatBad = await runSmokeAndCorsTest("POST /api/chat (Missing payload)", "/api/chat", {
      method: "POST",
      body: JSON.stringify({})
    }, 400);
    if (!chatBad.ok) allPassed = false;

    // 4. POST /api/assessment (Valid payload)
    const assessmentOk = await runSmokeAndCorsTest("POST /api/assessment (Valid payload)", "/api/assessment", {
      method: "POST",
      body: JSON.stringify({
        state: {
          currentQuestion: 1,
          questions: ["پێشەکی"],
          answers: ["سڵاو"]
        },
        profile: {
          name: "قوتابی",
          grade: "10",
          activeSubject: "math",
          level: "beginner"
        }
      })
    }, 200);
    if (!assessmentOk.ok) allPassed = false;

    // 5. POST /api/assessment (Missing payload)
    const assessmentBad = await runSmokeAndCorsTest("POST /api/assessment (Missing payload)", "/api/assessment", {
      method: "POST",
      body: JSON.stringify({})
    }, 400);
    if (!assessmentBad.ok) allPassed = false;

    // 6. POST /api/report (Valid payload)
    const reportOk = await runSmokeAndCorsTest("POST /api/report (Valid payload)", "/api/report", {
      method: "POST",
      body: JSON.stringify({
        profile: {
          name: "قوتابی",
          grade: "10",
          activeSubject: "math",
          level: "beginner"
        },
        summaryStats: {
          totalSessions: 5,
          weeklyQuestionCount: 12
        }
      })
    }, 200);
    if (!reportOk.ok) allPassed = false;

    // 7. POST /api/report (Missing payload)
    const reportBad = await runSmokeAndCorsTest("POST /api/report (Missing payload)", "/api/report", {
      method: "POST",
      body: JSON.stringify({})
    }, 400);
    if (!reportBad.ok) allPassed = false;

    // 8. POST /api/study/ask (Valid payload)
    const askOk = await runSmokeAndCorsTest("POST /api/study/ask (Valid payload)", "/api/study/ask", {
      method: "POST",
      body: JSON.stringify({
        message: "سڵاو",
        history: [],
        context: {
          studentName: "قوتابی",
          grade: "10",
          subject: "math",
          level: "beginner"
        }
      })
    }, 200);
    if (!askOk.ok) allPassed = false;

    // 9. POST /api/study/ask (Missing payload)
    const askBad = await runSmokeAndCorsTest("POST /api/study/ask (Missing payload)", "/api/study/ask", {
      method: "POST",
      body: JSON.stringify({})
    }, 400);
    if (!askBad.ok) allPassed = false;

    // 10. POST /api/study/vision (Valid payload: correct 8-byte PNG image)
    const validPng = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const validBlob = new Blob([validPng], { type: 'image/png' });
    const validFormData = new FormData();
    validFormData.append('image', validBlob, 'test.png');
    validFormData.append('context', JSON.stringify({
      studentId: "test-student-id",
      grade: "10",
      stream: "scientific",
      subject: "math",
      level: "beginner",
      lessonTitle: "Equations",
      conceptTitle: "Factoring"
    }));
    validFormData.append('mode', 'explain');

    const visionOk = await runSmokeAndCorsTest("POST /api/study/vision (Valid payload)", "/api/study/vision", {
      method: "POST",
      body: validFormData
    }, 200);
    if (!visionOk.ok) allPassed = false;

    // 11. POST /api/study/vision (Missing image payload)
    const visionMissingImageFormData = new FormData();
    visionMissingImageFormData.append('mode', 'explain');
    const visionMissingImage = await runSmokeAndCorsTest("POST /api/study/vision (Missing image)", "/api/study/vision", {
      method: "POST",
      body: visionMissingImageFormData
    }, 400);
    if (!visionMissingImage.ok) allPassed = false;

    // 12. POST /api/study/vision (Oversized image payload: > 5MB)
    const hugeBuffer = new Uint8Array(6 * 1024 * 1024); // 6MB
    // Set valid signature so it passes type verification first
    hugeBuffer[0] = 0x89; hugeBuffer[1] = 0x50; hugeBuffer[2] = 0x4E; hugeBuffer[3] = 0x47;
    hugeBuffer[4] = 0x0D; hugeBuffer[5] = 0x0A; hugeBuffer[6] = 0x1A; hugeBuffer[7] = 0x0A;
    const hugeBlob = new Blob([hugeBuffer], { type: 'image/png' });
    const visionOversizedFormData = new FormData();
    visionOversizedFormData.append('image', hugeBlob, 'huge.png');
    visionOversizedFormData.append('context', JSON.stringify({
      studentId: "test-student-id",
      grade: "10",
      stream: "scientific",
      subject: "math",
      level: "beginner"
    }));
    const visionOversized = await runSmokeAndCorsTest("POST /api/study/vision (Oversized 6MB payload)", "/api/study/vision", {
      method: "POST",
      body: visionOversizedFormData
    }, 413);
    if (!visionOversized.ok) allPassed = false;

    // 13. POST /api/study/vision (Unsupported file signature)
    const invalidSignaturePng = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const invalidSignatureBlob = new Blob([invalidSignaturePng], { type: 'image/png' });
    const visionBadSigFormData = new FormData();
    visionBadSigFormData.append('image', invalidSignatureBlob, 'bad_sig.png');
    visionBadSigFormData.append('context', JSON.stringify({
      studentId: "test-student-id",
      grade: "10",
      stream: "scientific",
      subject: "math",
      level: "beginner"
    }));
    const visionBadSig = await runSmokeAndCorsTest("POST /api/study/vision (Unsupported signature)", "/api/study/vision", {
      method: "POST",
      body: visionBadSigFormData
    }, 415);
    if (!visionBadSig.ok) allPassed = false;

    if (!allPassed) {
      console.error("\n❌ Production smoke tests FAILED.");
      process.exit(1);
    } else {
      console.log("\n✅ All production smoke tests passed successfully!");
      process.exit(0);
    }
  } catch (err) {
    console.error("❌ Exception occurred during smoke tests:", err);
    process.exit(1);
  }
}

main();
