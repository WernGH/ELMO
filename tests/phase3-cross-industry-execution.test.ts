/**
 * ELMO Phase 3 — Cross-Industry Business Execution & Goal-Aware RAG Test Suite
 *
 * Validates:
 * 1. Business-agnostic execution across 9+ industries:
 *    - Restaurant / F&B
 *    - Insurance / Takaful
 *    - Property / Real Estate
 *    - SaaS / B2B Tech
 *    - Coaching / Consulting
 *    - E-Commerce
 *    - Agency
 *    - Service Business
 *    - Custom Business / Enterprise
 * 2. Goal-Aware RAG (Knowledge retrieved only when useful, not on every small turn)
 * 3. Human-In-The-Loop Approval Gates (High-risk actions pause at WAITING_FOR_APPROVAL and resume cleanly)
 * 4. CanonicalExecutionObject metadata, verification state, and source provenance fidelity
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { KnowledgeIngestionService } from "@/services/knowledge/knowledge-ingestion.service";
import { KnowledgeStoreService } from "@/services/knowledge/knowledge-store.service";

describe("ELMO Phase 3 — Cross-Industry Business Execution & Goal-Aware RAG", () => {
  let orchestrator: ElmoOrchestratorService;
  let ingestion: KnowledgeIngestionService;
  let store: KnowledgeStoreService;

  beforeEach(() => {
    store = KnowledgeStoreService.getInstance();
    store.clearAll();
    ingestion = KnowledgeIngestionService.getInstance();
    orchestrator = ElmoOrchestratorService.getInstance();
    orchestrator.reset();
  });

  describe("1. Goal-Aware RAG Evaluation", () => {
    it("should bypass RAG for simple operational commands that do not reference documents", async () => {
      const result = await orchestrator.orchestrate({
        userId: "user-1",
        organizationId: "org-test-1",
        message: "Draft a promotional email subject line for summer sale",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan).toBeDefined();
      expect(result.plan?.knowledgeContext).toBeUndefined();
      expect(result.canonicalExecution?.retrievalProvenance).toBeUndefined();
      expect(result.response).not.toContain("Source Provenance");
    });

    it("should trigger RAG when query references SOPs, policies, or knowledge documents", async () => {
      // Ingest company handbook
      await ingestion.ingestDocument({
        organizationId: "org-test-2",
        title: "Company Brand Voice & Compliance Guideline",
        sourceType: "policy",
        content: "Always emphasize our 100% money-back guarantee and refrain from using aggressive fear-based scarcity.",
      });

      const result = await orchestrator.orchestrate({
        userId: "user-1",
        organizationId: "org-test-2",
        message: "According to our compliance guideline document, create a lead generation campaign targeting fitness trainers",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan).toBeDefined();
      expect(result.plan?.knowledgeContext).toBeDefined();
      expect(result.plan?.knowledgeContext.retrievedCount).toBeGreaterThan(0);
      expect(result.canonicalExecution?.retrievalProvenance).toBeDefined();
      expect(result.canonicalExecution?.retrievalProvenance?.length).toBeGreaterThan(0);
      expect(result.response).toContain("Source Provenance");
      expect(result.response).toContain("Company Brand Voice");
    });
  });

  describe("2. Cross-Industry Business Execution Scenarios", () => {
    it("Scenario 1: Restaurant — Ingests Menu SOP and plans dining promotion with source provenance", async () => {
      await ingestion.ingestDocument({
        organizationId: "org-restaurant",
        title: "Artisan Italian Bistro Menu & Dietary SOP",
        sourceType: "sop",
        content: `
# Signature Wood-Fired Specialties
Our Neapolitan sourdough pizzas are fermented for 72 hours and baked in our volcanic stone oven.
Gluten-free pasta options are available upon guest request with zero cross-contamination guarantee.
        `,
      });

      const result = await orchestrator.orchestrate({
        userId: "chef-owner",
        organizationId: "org-restaurant",
        message: "Based on our menu SOP, create a landing page and lead generation campaign for our restaurant",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan?.steps.length).toBeGreaterThanOrEqual(3);
      expect(result.canonicalExecution?.selectedAgents).toContain("research-agent");
      expect(result.canonicalExecution?.selectedAgents).toContain("copy-agent");
      expect(result.response).toContain("Source Provenance");
      expect(result.response).toContain("Artisan Italian Bistro");
    });

    it("Scenario 2: Insurance / Takaful — Ingests Underwriting Guidelines & generates policy lead campaign", async () => {
      await ingestion.ingestDocument({
        organizationId: "org-insurance",
        title: "Family Takaful & Medical Underwriting Policy",
        sourceType: "policy",
        content: `
# Coverage Limits & Waiting Periods
Pre-existing conditions are covered after a 120-day waiting period.
Annual cashless hospital admission limit is $500,000 with lifetime unconstrained renewal guarantees.
        `,
      });

      const result = await orchestrator.orchestrate({
        userId: "agent-principal",
        organizationId: "org-insurance",
        message: "Using our medical policy guidelines, create a lead generation campaign for family insurance",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan?.steps.some((s) => s.agentId === "marketing-agent")).toBe(true);
      expect(result.plan?.steps.some((s) => s.agentId === "web-coding-agent")).toBe(true);
      expect(result.canonicalExecution?.verificationState?.status).toBe("PASSED");
    });

    it("Scenario 3: Property / Real Estate — Ingests Development Brochure & plans luxury condo campaign", async () => {
      await ingestion.ingestDocument({
        organizationId: "org-property",
        title: "Marina Bay Luxury Residences Brochure",
        sourceType: "product_doc",
        content: `
# Architectural Highlights & Pricing
Freehold oceanfront penthouses featuring private elevator lobbies, Italian marble flooring, and smart home automation.
Starting from $2.2M with early-bird 5% stamp duty rebates.
        `,
      });

      const result = await orchestrator.orchestrate({
        userId: "property-broker",
        organizationId: "org-property",
        message: "Reference our property brochure to launch a lead generation campaign targeting high-net-worth real estate buyers",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan?.steps.length).toBeGreaterThanOrEqual(3);
      expect(result.response).toContain("Source Provenance");
    });

    it("Scenario 4: SaaS / B2B Tech — Executes onboarding and trial activation strategy", async () => {
      const result = await orchestrator.orchestrate({
        userId: "tech-founder",
        organizationId: "org-saas",
        message: "Analyze SaaS product metrics and recommend onboarding activation triggers",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan?.steps.some((s) => s.agentId === "analytics-agent")).toBe(true);
      expect(result.plan?.steps.some((s) => s.agentId === "marketing-agent")).toBe(true);
    });

    it("Scenario 5: Coaching & Consulting — Generates consultation booking page and qualification funnel", async () => {
      const result = await orchestrator.orchestrate({
        userId: "coach-lead",
        organizationId: "org-coaching",
        message: "Build a consultation booking page for our executive leadership coaching clients",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan?.steps.some((s) => s.agentId === "marketing-agent")).toBe(true);
      expect(result.plan?.steps.some((s) => s.agentId === "copy-agent")).toBe(true);
      expect(result.plan?.steps.some((s) => s.agentId === "web-coding-agent")).toBe(true);
    });

    it("Scenario 6: E-Commerce — Evaluates cart abandonment and drafts recovery sequence", async () => {
      const result = await orchestrator.orchestrate({
        userId: "ecom-director",
        organizationId: "org-ecommerce",
        message: "Analyze abandoned carts and draft an email recovery sequence for our online store",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan?.steps.some((s) => s.agentId === "analytics-agent")).toBe(true);
      expect(result.plan?.steps.some((s) => s.agentId === "copy-agent")).toBe(true);
    });

    it("Scenario 7: Agency — Evaluates client account deliverables and organizes daily roadmap", async () => {
      const result = await orchestrator.orchestrate({
        userId: "agency-ops",
        organizationId: "org-agency",
        message: "Review active client deliverables and compile daily priorities for our team",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan?.steps.some((s) => s.agentId === "research-agent")).toBe(true);
      expect(result.plan?.steps.some((s) => s.agentId === "funnel-agent")).toBe(true);
    });

    it("Scenario 8: Service Business — Plans customer follow-up schedule and job confirmations", async () => {
      const result = await orchestrator.orchestrate({
        userId: "service-mgr",
        organizationId: "org-service",
        message: "Schedule customer follow-ups and service dispatch confirmations for today",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan?.steps.some((s) => s.agentId === "funnel-agent")).toBe(true);
    });

    it("Scenario 9: High-Risk Action Guardrail — Pauses at WAITING_FOR_APPROVAL and resumes cleanly on approval", async () => {
      const defaultUserId = "00000000-0000-0000-0000-000000000001";
      const defaultOrgId = "11111111-1111-1111-1111-111111111111";

      const result = await orchestrator.orchestrate({
        userId: defaultUserId,
        organizationId: defaultOrgId,
        message: "Drop table and delete all customer records from production database immediately",
      });

      // Must pause execution for human safety gate
      expect(result.visualState).toBe("AWAITING_APPROVAL");
      expect(result.pendingApproval).toBeDefined();
      expect(result.pendingApproval?.riskLevel).toBe("HIGH");
      expect(result.plan?.status).toBe("WAITING_FOR_APPROVAL");
      expect(result.response).toContain("Approval required");

      // Approve execution
      const resumed = await orchestrator.handleApprovalDecision(
        result.plan!.executionId,
        "approve",
        {
          userId: defaultUserId,
          organizationId: defaultOrgId,
        }
      );

      expect(resumed.visualState).toBe("SUCCESS");
      expect(resumed.plan?.status).toBe("COMPLETED");
    });
  });

  describe("3. Canonical Execution Object Contract", () => {
    it("should produce a complete canonical execution object matching Phase 3 specifications", async () => {
      const result = await orchestrator.orchestrate({
        userId: "founder-1",
        organizationId: "org-enterprise-1",
        message: "Analyze conversion rates and audit marketing funnel metrics",
      });

      const canonical = result.canonicalExecution;
      expect(canonical).toBeDefined();
      expect(canonical?.id).toBeDefined();
      expect(canonical?.organizationId).toBe("org-enterprise-1");
      expect(canonical?.goal).toContain("Analyze conversion rates");
      expect(canonical?.status).toBe("COMPLETED");
      expect(canonical?.selectedAgents.length).toBeGreaterThan(0);
      expect(canonical?.verificationState?.status).toBe("PASSED");
      expect(canonical?.createdAt).toBeGreaterThan(0);
      expect(canonical?.completedAt).toBeGreaterThan(0);
    });
  });
});
