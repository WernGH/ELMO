/**
 * ELMO Phase 3 — End-to-End Agentic Engine & AI Web/Coding Acceptance Suite
 *
 * Verifies all 3 core acceptance criteria from the specification:
 * 1. End-to-End Multi-Agent Flow: "ELMO, build me a landing page for my AI business targeting property agents."
 * 2. Simple Single-Agent Flow: "Give me three headlines for my landing page."
 * 3. Natural Language Web Edit Flow: "Make the landing page more premium and mobile friendly."
 * 4. Multilingual & Voice continuity.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { WebCodingAgentService } from "@/services/agentic/web-coding/web-coding-agent.service";

describe("Phase 3 End-to-End Acceptance Suite", () => {
  let intelligenceService: ELMOIntelligenceService;
  let orchestrator: ElmoOrchestratorService;
  const store = MockDataStore.getInstance();

  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    store.reset();
    ELMOIntelligenceService.resetInstance();
    ElmoOrchestratorService.resetInstance();
    WebCodingAgentService.getInstance().reset();

    intelligenceService = ELMOIntelligenceService.getInstance();
    orchestrator = ElmoOrchestratorService.getInstance();
  });

  // ==========================================================================
  // 1. Requirement #41: End-to-End Multi-Agent Workflow
  // ==========================================================================
  it("Requirement #41: should execute full multi-agent landing page generation under ELMO Central Brain", async () => {
    const res = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "ELMO, build me a landing page for my AI business targeting property agents.",
      inputMode: "text",
    });

    expect(res).toBeDefined();
    expect(res.provider).toBe("elmo-orchestrator");
    expect(res.visualState).toBe("SUCCESS");
    expect(res.text).toContain("Marketing Strategy");
    expect(res.text).toContain("Conversion Copy");
    expect(res.text).toContain("Web & Page Architecture");
    expect(res.text).toContain("Your interactive landing page is live and ready to preview");

    // Check preview payload attached to the response
    expect(res.previewPayload).toBeDefined();
    const preview = res.previewPayload as any;
    expect(preview.sectionsCount).toBe(5);
    expect(preview.renderedHtml).toContain("Property Agents");
    expect(preview.viewportOptions).toEqual(["desktop", "tablet", "mobile"]);

    // Check execution plan
    expect(res.executionPlan).toBeDefined();
    const plan = res.executionPlan as any;
    expect(plan.status).toBe("COMPLETED");
    expect(plan.steps.length).toBe(4);
  });

  // ==========================================================================
  // 2. Requirement #42: Simple Request Acceptance Test (No Heavy Multi-Agent Overkill)
  // ==========================================================================
  it("Requirement #42: should handle simple copy requests directly via Copy Agent without heavy multi-agent planning", async () => {
    const res = await orchestrator.orchestrate({
      userId,
      organizationId: orgId,
      message: "Give me three headlines for my landing page.",
    });

    expect(res.isDirectAnswer).toBe(false);
    expect(res.plan?.steps.length).toBe(1);
    expect(res.plan?.steps[0].agentId).toBe("copy-agent");
    expect(res.agentResults[0].data.headlines).toBeDefined();
    expect((res.agentResults[0].data.headlines as string[]).length).toBe(3);
    expect(res.response).toContain("Crafted high-conversion landing page copy");
  });

  // ==========================================================================
  // 3. Requirement #43: Website Edit Acceptance Test
  // ==========================================================================
  it("Requirement #43: should execute natural language website editing ('Make the landing page more premium and mobile friendly')", async () => {
    // 1. Initial build
    await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "build me a landing page for my AI business targeting property agents",
    });

    // 2. Edit instruction
    const editRes = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "Make the landing page more premium and mobile friendly.",
    });

    expect(editRes).toBeDefined();
    expect(editRes.provider).toBe("elmo-orchestrator");
    expect(editRes.text).toContain("Upgraded hero section to premium typography");
    expect(editRes.previewPayload).toBeDefined();

    const preview = editRes.previewPayload as any;
    expect(preview.renderedHtml).toContain("Exclusive Enterprise");
    expect(preview.renderedHtml).toContain("Visionary Leaders");
  });

  // ==========================================================================
  // 4. Voice & Multilingual Flow
  // ==========================================================================
  it("should process Malay language landing page instruction through shared intelligence pipeline", async () => {
    const malayRes = await intelligenceService.processMessage({
      userId,
      organizationId: orgId,
      message: "Tolong bina landing page untuk ejen hartanah dengan tawaran percuma.",
      inputMode: "voice",
    });

    expect(malayRes).toBeDefined();
    expect(malayRes.inputMode).toBe("voice");
    expect(malayRes.provider).toBe("elmo-orchestrator");
    expect(malayRes.previewPayload).toBeDefined();
    expect(malayRes.visualState).toBe("SUCCESS");
  });
});
