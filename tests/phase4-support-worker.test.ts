/**
 * ELMO Phase 4 — Support Worker Test Suite
 *
 * Verifies:
 * 1. Support Worker registration, capabilities, tools, and robot identity.
 * 2. Transparent alias resolution (support-agent -> support-worker).
 * 3. Controlled tool validation and data access permissions.
 * 4. Support Specialist Agent execution with grounded Company Brain retrieval.
 * 5. Anti-hallucination validation and missing information flagging.
 * 6. Escalation and approval gating on sensitive operations (refunds, cancellations).
 * 7. Dynamic Semantic Planning (Zero Keyword Routing) for customer service objectives.
 * 8. Outcome verification rules.
 * 9. Inter-worker handoff contract creation and verification.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";
import { SupportAgent } from "@/services/agentic/specialists/support-agent";
import { DynamicTaskPlannerService } from "@/services/agentic/dynamic-task-planner.service";
import { OutcomeVerificationService } from "@/services/agentic/outcome-verification.service";
import { ToolRegistryService } from "@/services/agentic/tool-registry.service";
import { SupportWorkerOutput, ExecutionContext } from "@/services/agentic/types/agentic.types";

describe("Phase 4: Support Worker Extension", () => {
  let agentRegistry: AgentRegistryService;
  let workforceRegistry: WorkforceRegistryService;
  let planner: DynamicTaskPlannerService;
  let outcomeVerifier: OutcomeVerificationService;
  let toolRegistry: ToolRegistryService;
  let supportAgent: SupportAgent;
  const orgId = "org-support-test";

  beforeEach(() => {
    agentRegistry = AgentRegistryService.getInstance();
    agentRegistry.reset();
    workforceRegistry = WorkforceRegistryService.getInstance();
    workforceRegistry.reset();
    planner = DynamicTaskPlannerService.getInstance();
    outcomeVerifier = OutcomeVerificationService.getInstance();
    toolRegistry = ToolRegistryService.getInstance();
    supportAgent = SupportAgent.getInstance();
  });

  describe("1. Worker Registration & Identity", () => {
    it("should register support-worker with SUPPORT role and robotName", () => {
      const worker = agentRegistry.getWorker("support-worker");
      expect(worker).toBeDefined();
      expect(worker?.id).toBe("support-worker");
      expect(worker?.role).toBe("SUPPORT");
      expect(worker?.robotName).toBe("SUPPORT");
      expect(worker?.enabled).toBe(true);
      expect(worker?.capabilities).toContain("customer_support");
      expect(worker?.capabilities).toContain("customer_enquiry_classification");
      expect(worker?.capabilities).toContain("faq_handling");
      expect(worker?.capabilities).toContain("policy_retrieval");
      expect(worker?.capabilities).toContain("support_response_drafting");
      expect(worker?.capabilities).toContain("human_escalation");
    });

    it("should resolve aliases between support-agent and support-worker", () => {
      expect(agentRegistry.resolveWorkerAlias("support-agent")).toBe("support-worker");
      expect(agentRegistry.resolveWorkerAlias("support-worker")).toBe("support-worker");

      const agent = agentRegistry.getAgent("support-agent");
      const worker = agentRegistry.getWorker("support-worker");
      expect(agent).toBeDefined();
      expect(worker).toBeDefined();
      expect(agent?.role).toBe("SUPPORT");
      expect(worker?.role).toBe("SUPPORT");
    });

    it("should enforce authorized tools for Support Worker", () => {
      const worker = agentRegistry.getWorker("support-worker");
      expect(worker?.allowedTools).toContain("query_company_brain");
      expect(worker?.allowedTools).toContain("search_knowledge");
      expect(worker?.allowedTools).toContain("get_contact");
      expect(worker?.allowedTools).toContain("create_handoff_contract");

      const contactValidation = toolRegistry.validateToolCall("support-worker", "get_contact", {});
      expect(contactValidation.allowed).toBe(true);

      const knowledgeValidation = toolRegistry.validateToolCall("support-worker", "search_knowledge", {});
      expect(knowledgeValidation.allowed).toBe(true);

      // Disallow code execution
      const invalidValidation = toolRegistry.validateToolCall("support-worker", "execute_code", {});
      expect(invalidValidation.allowed).toBe(false);
    });
  });

  describe("2. Specialist Execution & Anti-Hallucination", () => {
    it("should classify general inquiry and draft grounded response without inventing facts", async () => {
      const context: ExecutionContext = {
        taskId: "task-sup-001",
        organizationId: orgId,
        agentId: "support-worker",
        channel: "web",
        permissions: ["support:read", "support:write"],
      };

      const result = await supportAgent.execute({
        messageId: "msg-sup-001",
        executionId: "exec-sup-001",
        sender: "test-runner",
        recipient: "support-worker",
        messageType: "TASK_REQUEST",
        task: "Customer asks: What is your standard support response SLA and onboarding timeline?",
        context,
        input: {},
        timestamp: Date.now(),
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const output = result.data as unknown as SupportWorkerOutput;
      expect(output.enquiryClassification).toBeDefined();
      expect(output.enquiryClassification.category).toBeDefined();
      expect(output.enquiryClassification.priority).toBeDefined();
      expect(output.responseDraft).toBeDefined();
      expect(output.responseDraft.messageText.length).toBeGreaterThan(20);
      expect(output.responseDraft.tone).toBe("empathetic_professional");
    });

    it("should flag missing customer details rather than inventing fake data", async () => {
      const context: ExecutionContext = {
        taskId: "task-sup-002",
        organizationId: orgId,
        agentId: "support-worker",
        channel: "email",
        permissions: ["support:read", "support:write"],
      };

      const result = await supportAgent.execute({
        messageId: "msg-sup-002",
        executionId: "exec-sup-002",
        sender: "test-runner",
        recipient: "support-worker",
        messageType: "TASK_REQUEST",
        task: "Customer asks about an unreferenced invoice: Can you check if my payment went through?",
        context,
        input: {},
        timestamp: Date.now(),
      });

      expect(result.success).toBe(true);
      const output = result.data as unknown as SupportWorkerOutput;

      // Anti-hallucination check: missing information must be flagged
      expect(output.responseDraft.missingInformationFlagged).toBe(true);
      expect(output.responseDraft.missingInformationFields).toContain("invoice_or_account_identifier");
      expect(output.customerContext?.identified).toBe(false);
    });

    it("should mandate human escalation and approval for sensitive refund requests", async () => {
      const context: ExecutionContext = {
        taskId: "task-sup-003",
        organizationId: orgId,
        agentId: "support-worker",
        channel: "chat",
        permissions: ["support:read", "support:write"],
      };

      const result = await supportAgent.execute({
        messageId: "msg-sup-003",
        executionId: "exec-sup-003",
        sender: "test-runner",
        recipient: "support-worker",
        messageType: "TASK_REQUEST",
        task: "Customer is demanding a full refund of $1,200 due to dissatisfaction",
        context,
        input: {},
        timestamp: Date.now(),
      });

      expect(result.success).toBe(true);
      const output = result.data as any;

      expect(output.enquiryClassification.category).toBe("billing_refund");
      expect(output.enquiryClassification.requiresHumanEscalation).toBe(true);
      expect(output.escalation.requiresApproval).toBe(true);
      expect(output.approvalRequired).toBe(true);
      expect(output.escalation.reason).toBeDefined();
    });
  });

  describe("3. Dynamic Semantic Planning (Zero Keyword Routing)", () => {
    it("should dynamically select support-worker for customer enquiry and ticket objectives", async () => {
      const plannerResult = await planner.plan({
        objective: "Investigate customer enquiry regarding billing discrepancy and draft policy-compliant response",
        organizationId: orgId,
        userId: "dev-user",
      });

      expect(plannerResult).toBeDefined();
      expect(plannerResult.plan).toBeDefined();
      expect(plannerResult.plan.steps.length).toBeGreaterThanOrEqual(1);

      const supportStep = plannerResult.plan.steps.find((s) => s.agentId === "support-worker");
      expect(supportStep).toBeDefined();
      expect(supportStep?.skills).toBeDefined();
    });

    it("should formulate support investigation with proper skill capabilities", async () => {
      const plannerResult = await planner.plan({
        objective: "Handle urgent customer complaint ticket regarding onboarding delay",
        organizationId: orgId,
        userId: "dev-user",
      });

      const supportStep = plannerResult.plan.steps.find((s) => s.agentId === "support-worker");
      expect(supportStep).toBeDefined();
      expect(supportStep?.skills).toContain("Customer Enquiry Handling");
    });
  });

  describe("4. Outcome Verification & Governance", () => {
    it("should pass verification when Support output includes grounded draft response", async () => {
      const validSupportOutput = {
        enquiryClassification: {
          category: "general_inquiry",
          priority: "medium",
          sentiment: "neutral",
          requiresHumanEscalation: false,
        },
        responseDraft: {
          messageText: "Thank you for reaching out. Our standard response SLA is 2 hours during business hours.",
          channel: "email",
          tone: "empathetic_professional",
          missingInformationFlagged: false,
        },
        approvalRequired: false,
      };

      const step = {
        id: "step-sup-1",
        name: "Resolve Customer Inquiry",
        agentId: "support-worker",
        status: "COMPLETED" as const,
      };

      const verification = outcomeVerifier.verifyStepOutcome(step as any, validSupportOutput as any, {
        organizationId: orgId,
      });

      expect(verification.success).toBe(true);
      expect(verification.business.passed).toBe(true);
      expect(verification.business.checks.some((c) => c.check === "grounded_response_drafted" && c.passed)).toBe(true);
      expect(verification.business.checks.some((c) => c.check === "sensitive_action_approval_flagged" && c.passed)).toBe(true);
    });

    it("should fail verification when refund request lacks human approval flag", async () => {
      const unapprovedRefundOutput = {
        enquiryClassification: {
          category: "billing_refund",
          priority: "urgent",
          sentiment: "frustrated",
          requiresHumanEscalation: false, // Security flaw: must require escalation
        },
        responseDraft: {
          messageText: "I have processed your refund of $500.",
          channel: "chat",
          tone: "casual",
          missingInformationFlagged: false,
        },
        approvalRequired: false, // Security flaw: must be true
      };

      const step = {
        id: "step-sup-unapproved",
        name: "Process Refund",
        agentId: "support-worker",
        status: "COMPLETED" as const,
      };

      const verification = outcomeVerifier.verifyStepOutcome(step as any, unapprovedRefundOutput as any, {
        organizationId: orgId,
      });

      expect(verification.success).toBe(false);
      expect(verification.defects.some((d) => d.includes("mandate ApprovalService clearance"))).toBe(true);
    });
  });

  describe("5. Inter-Worker Handoff Contract", () => {
    it("should create verified handoff contract from Support Worker to Sales Worker for commercial expansion", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-sup-handoff-1",
        taskId: "task-sup-001",
        fromWorkerId: "support-worker",
        toWorkerId: "sales-worker",
        objective: "Follow up on customer inquiry exhibiting high commercial upgrade intent",
        completedWork: "Resolved technical questions and identified customer need for enterprise seat tier.",
        requiredNextAction: "Initiate sales discovery call and prepare tailored expansion proposal",
        verificationStatus: "VERIFIED",
        outputs: {
          leadQualified: true,
          requestedTier: "Enterprise Pod",
          customerEmail: "vp@enterprise.com",
        },
        evidence: [
          "Customer consent provided for sales follow-up",
          "Support resolution verified by OutcomeVerificationService",
        ],
      });

      expect(handoff).toBeDefined();
      expect(handoff.handoffId).toMatch(/^hoff-/);
      expect(handoff.verificationStatus).toBe("VERIFIED");
      expect(handoff.fromWorkerId).toBe("support-worker");
      expect(handoff.toWorkerId).toBe("sales-worker");

      const storedHandoffs = workforceRegistry.getWorkerHandoffs(orgId);
      const found = storedHandoffs.find((h) => h.handoffId === handoff.handoffId);
      expect(found).toBeDefined();
      expect(found?.outputs.requestedTier).toBe("Enterprise Pod");
    });
  });
});
