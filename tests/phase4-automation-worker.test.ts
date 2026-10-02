/**
 * ELMO Phase 4 — Automation Worker Test Suite
 *
 * Verifies:
 * 1. Automation Worker registration, capabilities, tools, and robot identity.
 * 2. Transparent alias resolution (automation-agent -> automation-worker).
 * 3. Controlled tool validation and approval gates (create_automation vs activate_automation).
 * 4. Automation Specialist Agent execution (Trigger -> Condition -> Action -> Verification -> Result).
 * 5. Dynamic Semantic Planning (Zero Keyword Routing) for workflow automation objectives.
 * 6. Outcome verification rules (structural validity, no arbitrary code, approval flags).
 * 7. Inter-worker handoff contract creation and verification.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";
import { AutomationAgent } from "@/services/agentic/specialists/automation-agent";
import { DynamicTaskPlannerService } from "@/services/agentic/dynamic-task-planner.service";
import { OutcomeVerificationService } from "@/services/agentic/outcome-verification.service";
import { ToolRegistryService } from "@/services/agentic/tool-registry.service";
import { AutomationWorkflowOutput, ExecutionContext } from "@/services/agentic/types/agentic.types";

describe("Phase 4: Automation Worker Extension", () => {
  let agentRegistry: AgentRegistryService;
  let workforceRegistry: WorkforceRegistryService;
  let planner: DynamicTaskPlannerService;
  let outcomeVerifier: OutcomeVerificationService;
  let toolRegistry: ToolRegistryService;
  let automationAgent: AutomationAgent;
  const orgId = "org-automation-test";

  beforeEach(() => {
    agentRegistry = AgentRegistryService.getInstance();
    agentRegistry.reset();
    workforceRegistry = WorkforceRegistryService.getInstance();
    workforceRegistry.reset();
    planner = DynamicTaskPlannerService.getInstance();
    outcomeVerifier = OutcomeVerificationService.getInstance();
    toolRegistry = ToolRegistryService.getInstance();
    automationAgent = AutomationAgent.getInstance();
  });

  describe("1. Worker Registration & Identity", () => {
    it("should register automation-worker with AUTOMATION role and robotName", () => {
      const worker = agentRegistry.getWorker("automation-worker");
      expect(worker).toBeDefined();
      expect(worker?.id).toBe("automation-worker");
      expect(worker?.role).toBe("AUTOMATION");
      expect(worker?.robotName).toBe("AUTOMATION");
      expect(worker?.enabled).toBe(true);
      expect(worker?.capabilities).toContain("workflow_automation");
      expect(worker?.capabilities).toContain("workflow_discovery");
      expect(worker?.capabilities).toContain("trigger_identification");
      expect(worker?.capabilities).toContain("condition_mapping");
      expect(worker?.capabilities).toContain("action_mapping");
      expect(worker?.capabilities).toContain("automation_verification");
    });

    it("should resolve aliases between automation-agent and automation-worker", () => {
      expect(agentRegistry.resolveWorkerAlias("automation-agent")).toBe("automation-worker");
      expect(agentRegistry.resolveWorkerAlias("automation-worker")).toBe("automation-worker");

      const agent = agentRegistry.getAgent("automation-agent");
      const worker = agentRegistry.getWorker("automation-worker");
      expect(agent).toBeDefined();
      expect(worker).toBeDefined();
      expect(agent?.role).toBe("AUTOMATION");
      expect(worker?.role).toBe("AUTOMATION");
    });

    it("should enforce controlled tools and approval gates for Automation Worker", () => {
      const worker = agentRegistry.getWorker("automation-worker");
      expect(worker?.allowedTools).toContain("create_automation");
      expect(worker?.allowedTools).toContain("activate_automation");
      expect(worker?.allowedTools).toContain("manage_task");
      expect(worker?.allowedTools).toContain("trigger_event");

      // create_automation is low-risk, no approval required
      const createValidation = toolRegistry.validateToolCall("automation-worker", "create_automation", {});
      expect(createValidation.allowed).toBe(true);
      expect(createValidation.requiresApproval).toBe(false);

      // activate_automation is high-impact, MANDATES approval
      const activateValidation = toolRegistry.validateToolCall("automation-worker", "activate_automation", {});
      expect(activateValidation.allowed).toBe(true);
      expect(activateValidation.requiresApproval).toBe(true);
      expect(activateValidation.riskLevel).toBe("HIGH");

      // arbitrary code execution tools are strictly prohibited
      const invalidValidation = toolRegistry.validateToolCall("automation-worker", "execute_code", {});
      expect(invalidValidation.allowed).toBe(false);
    });
  });

  describe("2. Specialist Execution & Structured Workflow Schema", () => {
    it("should execute and generate structured event-driven workflow definition", async () => {
      const context: ExecutionContext = {
        taskId: "task-auto-001",
        organizationId: orgId,
        agentId: "automation-worker",
        channel: "web",
        permissions: ["automation:read", "automation:write"],
      };

      const result = await automationAgent.execute({
        messageId: "msg-auto-001",
        executionId: "exec-auto-001",
        sender: "test-runner",
        recipient: "automation-worker",
        messageType: "TASK_REQUEST",
        task: "Configure an automated workflow to qualify inbound leads from web forms and alert operations",
        context,
        input: {},
        timestamp: Date.now(),
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const output = (result.data as any).workflow as AutomationWorkflowOutput["workflow"];
      expect(output).toBeDefined();
      expect(output.name).toBeDefined();

      // Trigger
      expect(output.trigger).toBeDefined();
      expect(output.trigger.type).toBeDefined();
      expect(output.trigger.source).toBeDefined();
      expect(output.trigger.event).toBeDefined();

      // Conditions
      expect(Array.isArray(output.conditions)).toBe(true);
      expect(output.conditions.length).toBeGreaterThan(0);
      for (const cond of output.conditions) {
        expect(cond.field).toBeDefined();
        expect(cond.operator).toBeDefined();
      }

      // Actions
      expect(Array.isArray(output.actions)).toBe(true);
      expect(output.actions.length).toBeGreaterThan(0);
      for (const act of output.actions) {
        expect(act.stepNumber).toBeDefined();
        expect(act.actionType).toBeDefined();
        expect(act.targetTool).toBeDefined();
        expect(act.approvalRequired).toBeDefined();
        expect(act.riskLevel).toBeDefined();
      }

      // Verification & Result
      expect(output.verification).toBeDefined();
      expect(output.verification.tested).toBe(true);
      expect(output.result?.status).toBeDefined();
    });
  });

  describe("3. Dynamic Semantic Planning (Zero Keyword Routing)", () => {
    it("should dynamically select automation-worker for event-driven workflow tasks", async () => {
      const plannerResult = await planner.plan({
        objective: "Configure business automation workflow to automatically follow up when a new lead comes in",
        organizationId: orgId,
        userId: "dev-user",
      });

      expect(plannerResult).toBeDefined();
      expect(plannerResult.plan).toBeDefined();
      expect(plannerResult.plan.steps.length).toBeGreaterThanOrEqual(1);

      const autoStep = plannerResult.plan.steps.find((s) => s.agentId === "automation-worker");
      expect(autoStep).toBeDefined();
      expect(autoStep?.skills).toBeDefined();
    });

    it("should formulate multi-step collaborative plan from Strategy to Automation", async () => {
      const plannerResult = await planner.plan({
        objective: "Formulate business strategy and automate this process with event-driven triggers",
        organizationId: orgId,
        userId: "dev-user",
      });

      expect(plannerResult.plan.steps.length).toBeGreaterThanOrEqual(2);
      const stratStep = plannerResult.plan.steps.find((s) => s.agentId === "strategy-worker");
      const autoStep = plannerResult.plan.steps.find((s) => s.agentId === "automation-worker");

      expect(stratStep).toBeDefined();
      expect(autoStep).toBeDefined();
      // Automation step should depend on strategy step
      expect(autoStep?.dependencies).toContain(stratStep?.id);
    });
  });

  describe("4. Outcome Verification & Governance", () => {
    it("should pass verification when Automation output meets all criteria", async () => {
      const validWorkflowOutput: AutomationWorkflowOutput = {
        workflow: {
          name: "Inbound Lead Notification Pipeline",
          trigger: {
            type: "lead_submitted",
            source: "crm_form",
            event: "New prospect form submission",
          },
          conditions: [
            {
              field: "lead.email",
              operator: "exists",
              value: true,
            },
          ],
          actions: [
            {
              stepNumber: 1,
              actionType: "RECORD_LEAD",
              targetTool: "store_memory",
              params: { category: "lead" },
              approvalRequired: false,
              riskLevel: "LOW",
            },
            {
              stepNumber: 2,
              actionType: "ACTIVATE_CAMPAIGN_TRIGGER",
              targetTool: "activate_automation",
              params: { workflowId: "wf-101" },
              approvalRequired: true,
              riskLevel: "HIGH",
            },
          ],
          verification: {
            tested: true,
            failureDetectionRules: ["Dead-letter queue on CRM failure"],
            criteria: ["Lead record created within 500ms"],
          },
          result: {
            status: "CONFIGURED",
            summary: "Configured and verified end-to-end inbound pipeline.",
          },
        },
      };

      const step = {
        id: "step-auto-1",
        name: "Configure Automation Workflow",
        agentId: "automation-worker",
        status: "COMPLETED" as const,
      };

      const verification = outcomeVerifier.verifyStepOutcome(step as any, validWorkflowOutput as any, {
        organizationId: orgId,
      });

      expect(verification.success).toBe(true);
      expect(verification.business.passed).toBe(true);
      expect(verification.business.checks.some((c) => c.check === "valid_workflow_structure" && c.passed)).toBe(true);
      expect(verification.business.checks.some((c) => c.check === "no_arbitrary_code" && c.passed)).toBe(true);
      expect(verification.business.checks.some((c) => c.check === "high_impact_approval_flagged" && c.passed)).toBe(true);
    });

    it("should fail verification when workflow contains arbitrary code execution", async () => {
      const dangerousWorkflow = {
        workflow: {
          name: "Rogue Automation",
          trigger: { type: "webhook", source: "api", event: "ping" },
          conditions: [],
          actions: [
            {
              stepNumber: 1,
              actionType: "EXECUTE_SCRIPT",
              targetTool: "custom_script",
              params: { script: "child_process.execSync('rm -rf /')" },
              approvalRequired: false,
              riskLevel: "HIGH",
            },
          ],
        },
      };

      const step = {
        id: "step-auto-danger",
        name: "Configure Workflow",
        agentId: "automation-worker",
        status: "COMPLETED" as const,
      };

      const verification = outcomeVerifier.verifyStepOutcome(step as any, dangerousWorkflow as any, {
        organizationId: orgId,
      });

      expect(verification.success).toBe(false);
      expect(verification.defects.some((d) => d.includes("Security Violation"))).toBe(true);
    });

    it("should fail verification when high-risk action lacks approvalRequired flag", async () => {
      const unflaggedHighRiskWorkflow: AutomationWorkflowOutput = {
        workflow: {
          name: "Unapproved Production Activator",
          trigger: { type: "schedule", source: "cron", event: "daily" },
          conditions: [],
          actions: [
            {
              stepNumber: 1,
              actionType: "ACTIVATE_LIVE_SYSTEM",
              targetTool: "activate_automation",
              params: { rule: "production" },
              approvalRequired: false, // Security flaw: must be true
              riskLevel: "HIGH",
            },
          ],
          verification: {
            tested: true,
            failureDetectionRules: [],
            criteria: [],
          },
        },
      };

      const step = {
        id: "step-auto-unapproved",
        name: "Activate Automation",
        agentId: "automation-worker",
        status: "COMPLETED" as const,
      };

      const verification = outcomeVerifier.verifyStepOutcome(step as any, unflaggedHighRiskWorkflow as any, {
        organizationId: orgId,
      });

      expect(verification.success).toBe(false);
      expect(verification.defects.some((d) => d.includes("ApprovalService clearance"))).toBe(true);
    });
  });

  describe("5. Inter-Worker Handoff Contract", () => {
    it("should create verified handoff contract from Automation Worker to Operations Worker", () => {
      const handoff = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: "exec-auto-handoff-1",
        taskId: "task-auto-001",
        fromWorkerId: "automation-worker",
        toWorkerId: "operations-worker",
        objective: "Integrate tested lead qualification automation into standard operating procedures",
        completedWork: "Designed, tested, and verified event-driven webhook pipeline.",
        requiredNextAction: "Publish SOP documentation and monitor exception rates in operations dashboard",
        verificationStatus: "VERIFIED",
        outputs: {
          workflowId: "wf-lead-intake-001",
          triggerEvent: "lead_submitted",
          actionsCount: 3,
        },
        evidence: [
          "Workflow verified by OutcomeVerificationService",
          "Zero arbitrary code verified",
        ],
      });

      expect(handoff).toBeDefined();
      expect(handoff.handoffId).toMatch(/^hoff-/);
      expect(handoff.verificationStatus).toBe("VERIFIED");
      expect(handoff.fromWorkerId).toBe("automation-worker");
      expect(handoff.toWorkerId).toBe("operations-worker");

      const storedHandoffs = workforceRegistry.getWorkerHandoffs(orgId);
      const found = storedHandoffs.find((h) => h.handoffId === handoff.handoffId);
      expect(found).toBeDefined();
      expect(found?.outputs.workflowId).toBe("wf-lead-intake-001");
    });
  });
});
