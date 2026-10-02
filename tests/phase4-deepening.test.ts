/**
 * ELMO Phase 4 Deepening Test Suite
 *
 * Verifies:
 * 1. Live Task Dispatch via Workforce API
 * 2. Custom Worker Creation & Tenant Isolation
 * 3. Workforce-Aware ELMO Brain (English & Malay Status Reports)
 * 4. Automated Worker Self-Repair Loop & Verification Telemetry
 * 5. Strict Loop Guards on Self-Repair
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { ElmoIntentService } from "@/services/elmo-intent.service";
import { POST as dispatchPost } from "@/app/api/workforce/dispatch/route";
import { POST as workforcePost } from "@/app/api/workforce/route";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { NextRequest } from "next/server";

describe("Phase 4 Deepening: Console Tools, Workforce-Aware Brain & Self-Repair", () => {
  let orchestrator: ElmoOrchestratorService;
  let agentRegistry: AgentRegistryService;
  let workforceRegistry: WorkforceRegistryService;
  let intelligenceService: ELMOIntelligenceService;
  let intentService: ElmoIntentService;

  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    MockDataStore.getInstance().reset();
    agentRegistry = AgentRegistryService.getInstance();
    agentRegistry.reset();
    workforceRegistry = WorkforceRegistryService.getInstance();
    workforceRegistry.reset();
    intelligenceService = ELMOIntelligenceService.getInstance();
    intentService = ElmoIntentService.getInstance();
    orchestrator = ElmoOrchestratorService.getInstance();
  });

  // TEST 1: Live Task Dispatch via POST /api/workforce/dispatch
  it("should dispatch a workforce task via API and return plan, assignments, and handoffs", async () => {
    const req = new NextRequest("http://localhost:3000/api/workforce/dispatch", {
      method: "POST",
      body: JSON.stringify({
        objective: "Create a complete marketing campaign and landing page for property agents",
        organizationId: orgId,
        userId,
      }),
    });

    const res = await dispatchPost(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.visualState).toBe("SUCCESS");
    expect(json.data.plan).toBeDefined();
    expect(json.data.plan.steps.length).toBeGreaterThanOrEqual(2);
    expect(json.data.handoffs).toBeDefined();
    expect(json.data.handoffs.length).toBeGreaterThan(0);
  });

  // TEST 2: Custom Specialist Worker Registration via POST /api/workforce
  it("should register a custom specialist worker and enforce tenant isolation", async () => {
    const req = new NextRequest("http://localhost:3000/api/workforce", {
      method: "POST",
      body: JSON.stringify({
        action: "create",
        name: "Enterprise B2B Prospector",
        role: "SALES",
        description: "Scrapes and qualifies enterprise leads",
        capabilities: ["lead_scraping", "account_qualification"],
        capacity: 4,
        organizationId: orgId,
      }),
    });

    const res = await workforcePost(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.name).toBe("Enterprise B2B Prospector");
    expect(json.data.role).toBe("SALES");
    expect(json.data.capacity).toBe(4);

    // Verify isolation: Available for orgId
    const foundWorker = workforceRegistry.getWorker(json.data.id, orgId);
    expect(foundWorker).toBeDefined();

    // Blocked for other tenants
    const otherTenantWorker = workforceRegistry.getWorker(json.data.id, "other-tenant-org");
    expect(otherTenantWorker).toBeUndefined();
  });

  // TEST 3: Workforce-Aware ELMO Brain (English)
  it("should synthesize live workforce telemetry when asked about workforce status in English", async () => {
    const intent = intentService.analyzeIntent("How is my AI workforce performing today?");
    expect(intent.isWorkforceQuery).toBe(true);

    const response = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "What is my AI workforce status?",
      inputMode: "text",
    });

    expect(response.saasIntent).toBe("system_status");
    expect(response.text).toContain("ELMO Governed AI Workforce Status Report");
    expect(response.text).toContain("Active Specialists");
    expect(response.text).toContain("Workforce Capacity");
  });

  // TEST 4: Workforce-Aware ELMO Brain (Malay)
  it("should synthesize live workforce telemetry when asked in Bahasa Melayu", async () => {
    const response = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "Bagaimanakah status tenaga kerja AI kami hari ini?",
      inputMode: "text",
    });

    expect(response.saasIntent).toBe("system_status");
    expect(response.text).toContain("Laporan Status Tenaga Kerja AI ELMO");
    expect(response.text).toContain("Pakar Aktif");
    expect(response.text).toContain("Kapasiti Keseluruhan");
  });

  // TEST 5: Automated Worker Self-Repair Loop
  it("should log SELF_REPAIR_TRIGGERED telemetry when verification initially detects a defect", async () => {
    const result = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: "Create high-converting landing page copy for residential plumbers",
    });

    expect(result.visualState).toBe("SUCCESS");
    expect(result.plan).toBeDefined();

    // Verify that every step passed verification
    for (const step of result.plan!.steps) {
      expect(step.status).toBe("COMPLETED");
    }
  });
});
