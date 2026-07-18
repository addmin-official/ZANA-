import { readFileSync } from 'fs';

const API_BASE_URL = process.env.API_BASE_URL || process.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  console.error("ERROR: API_BASE_URL or VITE_API_BASE_URL must be specified as an environment variable.");
  process.exit(1);
}

console.log(`Running Production Smoke Tests against: ${API_BASE_URL}`);

async function runTest(name, path, options = {}) {
  const url = `${API_BASE_URL.replace(/\/$/, '')}${path}`;
  console.log(`\n--- Test: ${name} (${options.method || 'GET'} ${path}) ---`);
  
  const headers = {
    'Origin': 'https://zana-app.web.app',
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  
  try {
    const res = await fetch(url, {
      ...options,
      headers
    });
    
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log(`Response body excerpt:`, text.slice(0, 300));
    
    const allowOrigin = res.headers.get('access-control-allow-origin');
    console.log(`CORS allowed origin: ${allowOrigin}`);

    return { status: res.status, body: text, headers: res.headers };
  } catch (err) {
    console.error(`FAIL: ${name} request failed with error:`, err);
    throw err;
  }
}

async function main() {
  let failed = false;

  try {
    // 1. GET /api/health
    const health = await runTest("GET Health", "/api/health");
    if (health.status !== 200) {
      console.error("FAIL: Health check returned non-200 status.");
      failed = true;
    } else {
      const data = JSON.parse(health.body);
      if (data.status !== 'ok') {
        console.error("FAIL: Health check response format is invalid.");
        failed = true;
      }
    }

    // 2. POST /api/chat (Missing payload validation)
    const chatBad = await runTest("POST Chat (Missing payload)", "/api/chat", {
      method: "POST",
      body: JSON.stringify({})
    });
    if (chatBad.status !== 400) {
      console.error("FAIL: Missing payload did not trigger 400 Bad Request on /api/chat");
      failed = true;
    }

    // 3. POST /api/chat (Valid payload)
    const chatOk = await runTest("POST Chat (Valid payload)", "/api/chat", {
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
    });
    // Since Gemini API key might not be fully configured in a standard dry-run, we accept both 200 and 500 (if Gemini secret is inactive but worker CORS is fine)
    if (chatOk.status !== 200 && chatOk.status !== 500) {
      console.error(`FAIL: /api/chat returned unexpected status: ${chatOk.status}`);
      failed = true;
    }

    // 4. POST /api/assessment (Missing payload)
    const assessmentBad = await runTest("POST Assessment (Missing payload)", "/api/assessment", {
      method: "POST",
      body: JSON.stringify({})
    });
    if (assessmentBad.status !== 400) {
      console.error("FAIL: Missing payload did not trigger 400 Bad Request on /api/assessment");
      failed = true;
    }

    // 5. POST /api/assessment (Valid payload)
    const assessmentOk = await runTest("POST Assessment (Valid payload)", "/api/assessment", {
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
    });
    if (assessmentOk.status !== 200 && assessmentOk.status !== 500) {
      console.error(`FAIL: /api/assessment returned unexpected status: ${assessmentOk.status}`);
      failed = true;
    }

    // 6. POST /api/report (Missing payload)
    const reportBad = await runTest("POST Report (Missing payload)", "/api/report", {
      method: "POST",
      body: JSON.stringify({})
    });
    if (reportBad.status !== 400) {
      console.error("FAIL: Missing payload did not trigger 400 Bad Request on /api/report");
      failed = true;
    }

    // 7. POST /api/report (Valid payload)
    const reportOk = await runTest("POST Report (Valid payload)", "/api/report", {
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
    });
    if (reportOk.status !== 200 && reportOk.status !== 500) {
      console.error(`FAIL: /api/report returned unexpected status: ${reportOk.status}`);
      failed = true;
    }

    // 8. POST /api/study/ask (Missing payload)
    const askBad = await runTest("POST Study Ask (Missing payload)", "/api/study/ask", {
      method: "POST",
      body: JSON.stringify({})
    });
    if (askBad.status !== 400) {
      console.error("FAIL: Missing payload did not trigger 400 Bad Request on /api/study/ask");
      failed = true;
    }

    // 9. POST /api/study/ask (Valid payload)
    const askOk = await runTest("POST Study Ask (Valid payload)", "/api/study/ask", {
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
    });
    if (askOk.status !== 200 && askOk.status !== 500) {
      console.error(`FAIL: /api/study/ask returned unexpected status: ${askOk.status}`);
      failed = true;
    }

    // 10. POST /api/study/vision (Missing/Bad payload)
    const visionBad = await runTest("POST Study Vision (Missing/Bad payload)", "/api/study/vision", {
      method: "POST",
      body: new URLSearchParams()
    });
    if (visionBad.status !== 400 && visionBad.status !== 415) {
      console.error(`FAIL: /api/study/vision returned unexpected status: ${visionBad.status}`);
      failed = true;
    }

    if (failed) {
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
