// Full System Auditor Script for ELMO
const BASE_URL = "http://localhost:3000";

async function runAudit() {
  console.log("==================================================");
  console.log("   ELMO FULL SYSTEM COMPREHENSIVE AUDIT REPORT    ");
  console.log("==================================================\n");

  const results = {
    apiRoutes: [],
    pages: [],
    errors: [],
  };

  // 1. API ROUTES AUDIT
  console.log("--- Probing API Routes ---");
  const apiTests = [
    {
      name: "GET /api/health",
      url: `${BASE_URL}/api/health`,
      method: "GET",
      expectedStatus: 200,
    },
    {
      name: "GET /api/organizations",
      url: `${BASE_URL}/api/organizations?userId=00000000-0000-0000-0000-000000000001`,
      method: "GET",
      expectedStatus: 200,
    },
    {
      name: "POST /api/organizations",
      url: `${BASE_URL}/api/organizations`,
      method: "POST",
      body: JSON.stringify({
        name: "Audit Verification Org " + Date.now(),
        slug: "audit-org-" + Date.now(),
        userId: "00000000-0000-0000-0000-000000000001",
      }),
      headers: { "Content-Type": "application/json" },
      expectedStatus: 201,
    },
    {
      name: "POST /api/voice/session",
      url: `${BASE_URL}/api/voice/session`,
      method: "POST",
      body: JSON.stringify({
        id: "vs-audit-" + Date.now(),
        organizationId: "11111111-1111-1111-1111-111111111111",
        userId: "00000000-0000-0000-0000-000000000001",
        startedAt: new Date().toISOString(),
        durationSeconds: 15,
        detectedLanguage: "en-US",
        userTurnsCount: 1,
        assistantTurnsCount: 1,
        status: "completed",
        metadata: { audit: true },
      }),
      headers: { "Content-Type": "application/json" },
      expectedStatus: 200,
    },
    {
      name: "GET /api/conversations",
      url: `${BASE_URL}/api/conversations?organizationId=11111111-1111-1111-1111-111111111111&userId=00000000-0000-0000-0000-000000000001`,
      method: "GET",
      expectedStatus: 200,
    },
    {
      name: "POST /api/conversations",
      url: `${BASE_URL}/api/conversations`,
      method: "POST",
      body: JSON.stringify({
        organizationId: "11111111-1111-1111-1111-111111111111",
        userId: "00000000-0000-0000-0000-000000000001",
        title: "Audit Test Conversation " + Date.now(),
      }),
      headers: { "Content-Type": "application/json" },
      expectedStatus: 201,
    },
    {
      name: "POST /api/chat (Streaming Response)",
      url: `${BASE_URL}/api/chat`,
      method: "POST",
      body: JSON.stringify({
        message: "System health check prompt",
        organizationId: "11111111-1111-1111-1111-111111111111",
        userId: "00000000-0000-0000-0000-000000000001",
      }),
      headers: { "Content-Type": "application/json" },
      expectedStatus: 200,
    },
  ];

  for (const t of apiTests) {
    const start = Date.now();
    try {
      const res = await fetch(t.url, {
        method: t.method,
        headers: t.headers,
        body: t.body,
      });
      const duration = Date.now() - start;
      const passed = res.status === t.expectedStatus || (t.name.includes("chat") && res.status < 400);
      const icon = passed ? "✓" : "✗";
      console.log(` ${icon} [${res.status}] ${t.name} (${duration}ms)`);
      results.apiRoutes.push({ name: t.name, status: res.status, duration, passed });
      if (!passed) {
        const text = await res.text();
        results.errors.push({ target: t.name, status: res.status, body: text });
      }
    } catch (err) {
      console.log(` ✗ [ERR] ${t.name}: ${err.message}`);
      results.errors.push({ target: t.name, error: err.message });
    }
  }

  // 2. DASHBOARD FRONTEND PAGES AUDIT
  console.log("\n--- Probing Dashboard UI Pages ---");
  const pages = [
    "/overview",
    "/elmo",
    "/speak",
    "/activity",
    "/analytics",
    "/approvals",
    "/automations",
    "/contacts",
    "/emails",
    "/employees",
    "/forms",
    "/funnels",
    "/goals",
    "/integrations",
    "/memory",
    "/settings",
    "/tasks",
  ];

  for (const page of pages) {
    const start = Date.now();
    try {
      const res = await fetch(`${BASE_URL}${page}`, { method: "GET" });
      const duration = Date.now() - start;
      const passed = res.status === 200 || res.status === 307; // 307 is ok for auth redirects
      const icon = passed ? "✓" : "✗";
      console.log(` ${icon} [${res.status}] ${page} (${duration}ms)`);
      results.pages.push({ page, status: res.status, duration, passed });
      if (!passed) {
        results.errors.push({ target: page, status: res.status });
      }
    } catch (err) {
      console.log(` ✗ [ERR] ${page}: ${err.message}`);
      results.errors.push({ target: page, error: err.message });
    }
  }

  console.log("\n==================================================");
  console.log("                 AUDIT SUMMARY                    ");
  console.log("==================================================");
  console.log(`Total API Routes Checked: ${results.apiRoutes.length}`);
  console.log(`Total Pages Checked: ${results.pages.length}`);
  console.log(`Total System Errors: ${results.errors.length}`);

  if (results.errors.length === 0) {
    console.log("\n>>> FULL SYSTEM STATUS: 100% OPERATIONAL & HEALTHY <<<");
  } else {
    console.log("\n>>> DETECTED ERRORS:", JSON.stringify(results.errors, null, 2));
  }
}

runAudit().catch(console.error);
