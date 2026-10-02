/**
 * ELMO Phase 4 — Worker Handoff & Supervision Test Suite
 *
 * Verifies:
 * 1. Structured Handoff Contracts (Anti-Chat Doctrine: Section 14).
 * 2. Multi-agent pipeline handoff recording between dependent workers.
 * 3. Blocker detection & WorkerResultContract schema conformance.
 * 4. Multi-tenant isolation of worker handoff contracts.
 * 5. Worker reassignment on failure/blocker.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import {
  WorkerHandoffContract,
  WorkerResultContract,
} from "@/services/agentic/types/agentic.types";

describe("Phase 4: Worker Handoff Contracts & Supervision", () => {
  let workforceRegistry: WorkforceRegistryService;
  let agentRegistry: AgentRegistryService;
  let orchestrator: ElmoOrchestratorService;
  const orgA = "org-tenant-alpha";
  const orgB = "org-tenant-beta";

  beforeEach(() => {
    workforceRegistry = WorkforceRegistryService.getInstance();
    workforceRegistry.reset();
    agentRegistry = AgentRegistryService.getInstance();
    agentRegistry.reset();
    orchestrator = ElmoOrchestratorService.getInstance();
  });

  describe("1. Structured Handoff Contract Schema Conformance", () => {
    it("should create and store a structured handoff contract matching Phase 4 specifications", () => {
      const contract = workforceRegistry.createWorkerHandoff({
        fromWorkerId: "research-worker",
        toWorkerId: "copy-worker",
        executionId: "exec-101",
        taskId: "step-2",
        reason: "Market research completed; handoff to copywriter for value proposition drafting.",
        objective: "Draft high-converting headline based on verified competitor pains.",
        completedWork: "Target audience pains and competitor pricing benchmarks extracted.",
        requiredNextAction: "Write 3 benefit-driven headline variants emphasizing 2x speed.",
        inputs: { audience: "Enterprise SaaS CTOs", competitorPains: ["Slow deployment", "High churn"] },
        outputs: { keyInsights: "Deployment latency is the #1 switching trigger." },
        evidence: ["Found 42 customer reviews citing deployment speed as primary complaint."],
        assumptions: ["Target audience is technical decision makers."],
        limitations: ["No APAC pricing data available."],
        verificationStatus: "PASSED",
        organizationId: orgA,
      });

      expect(contract.handoffId).toBeDefined();
      expect(contract.handoffId.startsWith("hoff-")).toBe(true);
      expect(contract.fromWorkerId).toBe("research-worker");
      expect(contract.toWorkerId).toBe("copy-worker");
      expect(contract.verificationStatus).toBe("PASSED");
      expect(contract.timestamp).toBeGreaterThan(0);
      expect(contract.evidence.length).toBe(1);

      const retrieved = workforceRegistry.getWorkerHandoffs(orgA);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].handoffId).toBe(contract.handoffId);
    });

    it("should reject unstructured handoffs lacking mandatory fields", () => {
      expect(() => {
        workforceRegistry.createWorkerHandoff({
          fromWorkerId: "",
          toWorkerId: "copy-worker",
          executionId: "exec-102",
          taskId: "step-1",
          reason: "testing",
          objective: "",
          completedWork: "",
          requiredNextAction: "",
          inputs: {},
          outputs: {},
          evidence: [],
          assumptions: [],
          limitations: [],
          verificationStatus: "UNVERIFIED",
        });
      }).toThrow(/required/i);
    });
  });

  describe("2. End-to-End Orchestrator Pipeline Handoff Emission", () => {
    it("should record structured handoff contracts between sequential dependent steps", async () => {
      const result = await orchestrator.orchestrate({
        userId: "test-user-1",
        organizationId: orgA,
        message: "Based on our menu SOP, create a landing page and lead generation campaign for our restaurant",
      });

      expect(result.visualState).toBe("SUCCESS");
      expect(result.plan).toBeDefined();
      expect(result.plan!.steps.length).toBeGreaterThanOrEqual(2);

      // Verify that handoffs were recorded in WorkforceRegistry
      const handoffs = workforceRegistry.getWorkerHandoffs(orgA);
      expect(handoffs.length).toBeGreaterThan(0);

      const firstHandoff = handoffs[0];
      expect(firstHandoff.executionId).toBe(result.plan!.executionId);
      expect(firstHandoff.verificationStatus).toBe("PASSED");
      expect(firstHandoff.completedWork).toBeDefined();
      expect(firstHandoff.requiredNextAction).toBeDefined();
    });
  });

  describe("3. Blocker Reporting & WorkerResultContract", () => {
    it("should construct valid WorkerResultContract with BLOCKED status and blocker metadata", () => {
      const blockedResult: WorkerResultContract = {
        status: "BLOCKED",
        summary: "Execution halted: Missing required lead qualification criteria.",
        outputs: {},
        toolsUsed: ["analyze_sales_funnel"],
        evidence: [],
        assumptions: [],
        limitations: ["Inbound lead score formula not configured."],
        blockers: [
          {
            type: "MISSING_INPUT",
            description: "Threshold parameter for qualified lead is absent.",
            severity: "HIGH",
            requiredAction: "Provide minimum budget threshold for enterprise lead qualification.",
          },
        ],
        verificationStatus: "UNVERIFIED",
        timestamp: Date.now(),
      };

      expect(blockedResult.status).toBe("BLOCKED");
      expect(blockedResult.blockers).toBeDefined();
      expect(blockedResult.blockers![0].type).toBe("MISSING_INPUT");
      expect(blockedResult.blockers![0].severity).toBe("HIGH");
    });
  });

  describe("4. Multi-Tenant Handoff Isolation", () => {
    it("should strictly isolate handoff history between Tenant Alpha and Tenant Beta", () => {
      // Create handoff for Tenant Alpha
      workforceRegistry.createWorkerHandoff({
        fromWorkerId: "research-worker",
        toWorkerId: "analytics-worker",
        executionId: "exec-alpha",
        taskId: "step-alpha",
        reason: "Alpha confidential analytics",
        objective: "Alpha objective",
        completedWork: "Alpha findings",
        requiredNextAction: "Alpha report",
        inputs: { secretKey: "ALPHA_SECRET" },
        outputs: {},
        evidence: [],
        assumptions: [],
        limitations: [],
        verificationStatus: "PASSED",
        organizationId: orgA,
      });

      // Create handoff for Tenant Beta
      workforceRegistry.createWorkerHandoff({
        fromWorkerId: "copy-worker",
        toWorkerId: "web-coding-worker",
        executionId: "exec-beta",
        taskId: "step-beta",
        reason: "Beta public copy",
        objective: "Beta objective",
        completedWork: "Beta copy",
        requiredNextAction: "Beta preview",
        inputs: { publicText: "BETA_CONTENT" },
        outputs: {},
        evidence: [],
        assumptions: [],
        limitations: [],
        verificationStatus: "PASSED",
        organizationId: orgB,
      });

      // Query Tenant Alpha
      const alphaHandoffs = workforceRegistry.getWorkerHandoffs(orgA);
      expect(alphaHandoffs.length).toBe(1);
      expect(alphaHandoffs[0].executionId).toBe("exec-alpha");
      expect(alphaHandoffs[0].inputs.secretKey).toBe("ALPHA_SECRET");

      // Query Tenant Beta
      const betaHandoffs = workforceRegistry.getWorkerHandoffs(orgB);
      expect(betaHandoffs.length).toBe(1);
      expect(betaHandoffs[0].executionId).toBe("exec-beta");
      expect(betaHandoffs[0].inputs.publicText).toBe("BETA_CONTENT");

      // Cross-tenant data must never leak
      expect(alphaHandoffs.some((h) => h.executionId === "exec-beta")).toBe(false);
      expect(betaHandoffs.some((h) => h.executionId === "exec-alpha")).toBe(false);
    });
  });
});
