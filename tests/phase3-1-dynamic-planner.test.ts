/**
 * ELMO Phase 3.1 — Dynamic AI Task Planner & Hybrid Orchestration Test Suite
 *
 * Validates:
 * 1. Fast-Path vs Dynamic AI Task Decomposition routing.
 * 2. Cross-industry business problem decomposition (Restaurant, Insurance, SaaS, Ecommerce, Coaching, Agency, Service).
 * 3. Paraphrase resilience across diverse problem expressions.
 * 4. Ambiguity handling and WAITING_FOR_INPUT state.
 * 5. Human approval gates (WAITING_FOR_APPROVAL).
 * 6. Dual Technical & Business Verification.
 * 7. Prevention of false memory milestones.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { DynamicTaskPlannerService } from "@/services/agentic/dynamic-task-planner.service";
import { KnowledgeIngestionService } from "@/services/knowledge/knowledge-ingestion.service";
import { KnowledgeStoreService } from "@/services/knowledge/knowledge-store.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";

describe("Phase 3.1 Dynamic AI Task Planner & True AI-Native Execution", () => {
  const orchestrator = ElmoOrchestratorService.getInstance();
  const planner = DynamicTaskPlannerService.getInstance();
  const ingestion = KnowledgeIngestionService.getInstance();
  const store = KnowledgeStoreService.getInstance();
  const memoryService = ElmoMemoryService.getInstance();

  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    store.clearAll();
    orchestrator.reset();
  });

  describe("1. Fast-Path vs Dynamic Planner Discrimination", () => {
    it("should route deterministic landing page creation to fast path", () => {
      expect(orchestrator.isFastPathCandidate("create a landing page for Italian restaurant")).toBe(true);
      expect(orchestrator.isFastPathCandidate("publish website live")).toBe(true);
      expect(orchestrator.isFastPathCandidate("make the hero section dark mode")).toBe(true);
    });

    it("should NOT route open-ended business objectives or performance drops to fast path", () => {
      expect(orchestrator.isFastPathCandidate("My restaurant sales have dropped this month. Find out what may be causing it and help me improve revenue.")).toBe(false);
      expect(orchestrator.isFastPathCandidate("Policy renewals have fallen. Investigate why and determine what we should change.")).toBe(false);
      expect(orchestrator.isFastPathCandidate("Our free trial users aren't converting. Find the likely bottleneck and propose what should happen next.")).toBe(false);
      expect(orchestrator.isFastPathCandidate("Customers are abandoning purchases. Investigate the problem and help improve completed orders.")).toBe(false);
      expect(orchestrator.isFastPathCandidate("I have a business problem. Analyze it and determine what needs to happen.")).toBe(false);
    });
  });

  describe("2. Cross-Industry Dynamic Task Decomposition & Execution", () => {
    it("Test A: Restaurant — Sales drop investigation & revenue recovery", async () => {
      await ingestion.ingestDocument({
        organizationId: orgId,
        title: "Bistro Menu Pricing & Dining SOP",
        sourceType: "sop",
        content: "Weekend dinner average check dropped by 18% due to slow table turnover and lack of seasonal set menu bundles.",
      });

      const prompt = "My restaurant sales have dropped this month. Find out what may be causing it and help me improve revenue.";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: prompt,
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan).toBeDefined();

      // Verified: Multi-agent dynamic selection, NOT a fallback to funnel-agent!
      const agents = result.plan!.steps.map((s) => s.agentId);
      expect(agents).toContain("analytics-agent");
      expect(agents).toContain("research-agent");
      expect(agents).toContain("marketing-agent");
      expect(agents).not.toContain("funnel-agent");

      // Verified: Tools executed
      expect(result.canonicalExecution?.executedTools).toBeDefined();
      expect(result.canonicalExecution?.executedTools?.length).toBeGreaterThan(0);
      expect(result.canonicalExecution?.businessOutcomeStatus).toBe("BUSINESS_OUTCOME_VERIFIED");

      // Verified: Memory stored realistic strategic roadmap or verified execution, not false generic milestone
      const memories = await memoryService.searchRelevantMemory(orgId, "sales", "organization", 3);
      expect(memories.length).toBeGreaterThan(0);
      expect(memories[0].content).toContain("Analytics Agent");
    });

    it("Test B: Insurance — Policy renewals fallen investigation", async () => {
      const prompt = "Policy renewals have fallen. Investigate why and determine what we should change.";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: prompt,
      });

      expect(result.visualState).toBe("SUCCESS");
      const agents = result.plan!.steps.map((s) => s.agentId);
      expect(agents).toContain("analytics-agent");
      expect(agents).toContain("research-agent");
      expect(agents).toContain("marketing-agent");
      expect(result.canonicalExecution?.businessOutcomeStatus).toBe("BUSINESS_OUTCOME_VERIFIED");
    });

    it("Test C: SaaS — Free trial user conversion bottleneck", async () => {
      const prompt = "Our free trial users aren't converting. Find the likely bottleneck and propose what should happen next.";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: prompt,
      });

      expect(result.visualState).toBe("SUCCESS");
      const agents = result.plan!.steps.map((s) => s.agentId);
      expect(agents).toContain("analytics-agent");
      expect(agents).toContain("copy-agent");
      expect(result.canonicalExecution?.businessOutcomeStatus).toBe("BUSINESS_OUTCOME_VERIFIED");
    });

    it("Test D: E-Commerce — Cart abandonment reduction", async () => {
      const prompt = "Customers are abandoning purchases. Investigate the problem and help improve completed orders.";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: prompt,
      });

      expect(result.visualState).toBe("SUCCESS");
      const agents = result.plan!.steps.map((s) => s.agentId);
      expect(agents).toContain("analytics-agent");
      expect(agents).toContain("copy-agent");
      expect(result.canonicalExecution?.businessOutcomeStatus).toBe("BUSINESS_OUTCOME_VERIFIED");
    });

    it("Test E: Coaching — Client retention improvement", async () => {
      const prompt = "Clients aren't staying as long as before. Figure out what may be happening.";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: prompt,
      });

      expect(result.visualState).toBe("SUCCESS");
      const agents = result.plan!.steps.map((s) => s.agentId);
      expect(agents).toContain("analytics-agent");
      expect(agents).toContain("research-agent");
      expect(agents).toContain("marketing-agent");
    });

    it("Test F: Marketing Agency — Overdue client work backlog", async () => {
      const prompt = "We have too much client work and the team is struggling. Help determine what needs to change.";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: prompt,
      });

      expect(result.visualState).toBe("SUCCESS");
      const agents = result.plan!.steps.map((s) => s.agentId);
      expect(agents).toContain("research-agent");
      expect(agents).toContain("analytics-agent");
      expect(agents).toContain("marketing-agent");
    });

    it("Test G: Service Business — Customer delay complaints", async () => {
      const prompt = "Customers are complaining about delays. Investigate what could be causing the problem.";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: prompt,
      });

      expect(result.visualState).toBe("SUCCESS");
      const agents = result.plan!.steps.map((s) => s.agentId);
      expect(agents).toContain("research-agent");
      expect(agents).toContain("analytics-agent");
    });
  });

  describe("3. Paraphrase Resilience", () => {
    it("should dynamically decompose diverse paraphrases of revenue decline", async () => {
      const paraphrases = [
        "Our revenue has fallen.",
        "We aren't making as much money lately.",
        "Something is causing our restaurant revenue to decline.",
        "Can you investigate why we're earning less?",
        "Customers seem to be spending less.",
      ];

      for (const phrase of paraphrases) {
        const result = await orchestrator.orchestrate({
          userId,
          organizationId: orgId,
          message: phrase,
        });

        expect(result.visualState).toBe("SUCCESS");
        const agents = result.plan!.steps.map((s) => s.agentId);
        // Consistently selects analytical/strategic agents across all paraphrases
        expect(agents).toContain("analytics-agent");
        expect(agents).not.toContain("funnel-agent");
      }
    });
  });

  describe("4. Ambiguity Handling & WAITING_FOR_INPUT State", () => {
    it("Test H & J: should pause in WAITING_FOR_INPUT when objective is completely underspecified", async () => {
      const ambiguousPrompt = "I have a business problem. Analyze it and determine what needs to happen.";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: ambiguousPrompt,
      });

      // Does NOT blindly call Funnel Agent or pretend execution succeeded!
      expect(result.visualState).toBe("WAITING_FOR_INPUT");
      expect(result.businessOutcomeStatus).toBe("WAITING_FOR_INPUT");
      expect(result.plan?.status).toBe("WAITING_FOR_INPUT");
      expect(result.plan?.missingInformation?.length).toBeGreaterThan(0);
      expect(result.clarificationQuestions?.length).toBeGreaterThan(0);
      expect(result.response).toContain("I require clarification on a few critical business specifics");
    });

    it("should formulate dynamic plan once Company Brain context is provided for the ambiguous prompt", async () => {
      const ambiguousPrompt = "I have a business problem. Analyze it and determine what needs to happen.";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: ambiguousPrompt,
        companyBrainContext: {
          organization: { name: "Apex Global Logistics", industry: "Freight Transport" },
          memories: [{ content: "Fleet customs clearance bottleneck is delaying cross-border deliveries." }],
        },
      });

      // Context exists -> can decompose into an actionable plan!
      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan?.steps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("5. Human Approval Gate & Risk Enforcement", () => {
    it("Test K: should pause at WAITING_FOR_APPROVAL for high-risk actions", async () => {
      const highRiskPrompt = "Publish the website live to the public internet /p/welcome";
      const result = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: highRiskPrompt,
      });

      expect(result.visualState).toBe("AWAITING_APPROVAL");
      expect(result.pendingApproval).toBeDefined();
      expect(result.pendingApproval?.riskLevel).toBe("HIGH");
      expect(result.plan?.status).toBe("WAITING_FOR_APPROVAL");
      expect(result.response).toContain("Approval required before proceeding");
    });
  });

  describe("6. Critical Success Test (Audit Prompt 11)", () => {
    it("should dynamically understand and formulate plan for complex open-ended directive", async () => {
      const prompt =
        "I have a business problem. I don't know exactly what needs to be done. Analyze the situation, decide what information you need, determine the best workflow, and execute everything you are authorized to do. Ask me only when you genuinely need information or approval.";

      // With no business context -> genuinely asks for clarification (WAITING_FOR_INPUT)
      const ungroundedRes = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: prompt,
      });

      expect(ungroundedRes.visualState).toBe("WAITING_FOR_INPUT");
      expect(ungroundedRes.clarificationQuestions?.length).toBeGreaterThan(0);

      // When grounded with Company Brain context -> executes multi-agent strategic workflow
      const groundedRes = await orchestrator.orchestrate({
        userId,
        organizationId: orgId,
        message: prompt,
        companyBrainContext: {
          organization: { name: "OmniTech Solutions", industry: "Enterprise SaaS" },
          memories: [{ content: "Quarterly objective: Improve trial activation and reduce sales cycle latency." }],
        },
      });

      expect(groundedRes.visualState).toBe("SUCCESS");
      expect(groundedRes.plan?.steps.length).toBeGreaterThanOrEqual(2);
      expect(groundedRes.canonicalExecution?.businessOutcomeStatus).toBe("BUSINESS_OUTCOME_VERIFIED");
    });
  });
});
