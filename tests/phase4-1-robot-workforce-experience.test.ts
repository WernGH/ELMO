import { describe, it, expect, beforeEach } from "vitest";
import { OutcomeService } from "../src/services/agentic/outcome.service";
import { RobotIdentityService } from "../src/services/agentic/robot-identity.service";
import { AgentRegistryService } from "../src/services/agentic/agent-registry.service";
import { WorkforceArtifactService } from "../src/services/agentic/workforce-artifact.service";
import { WorkforceHealthService } from "../src/services/agentic/workforce-health.service";

describe("ELMO Phase 4.1 — Outcome-Driven Robot Workforce Experience", () => {
  const orgA = "11111111-1111-1111-1111-111111111111";
  const orgB = "22222222-2222-2222-2222-222222222222";
  const userId = "dev-user-001";

  let outcomeService: OutcomeService;
  let robotService: RobotIdentityService;
  let agentRegistry: AgentRegistryService;
  let artifactService: WorkforceArtifactService;
  let healthService: WorkforceHealthService;

  beforeEach(() => {
    OutcomeService.resetInstance();
    RobotIdentityService.resetInstance();
    AgentRegistryService.resetInstance();
    WorkforceArtifactService.resetInstance();
    WorkforceHealthService.resetInstance();

    outcomeService = OutcomeService.getInstance();
    robotService = RobotIdentityService.getInstance();
    agentRegistry = AgentRegistryService.getInstance();
    artifactService = WorkforceArtifactService.getInstance();
    healthService = WorkforceHealthService.getInstance();
  });

  // =========================================================================
  // 1. OUTCOME-FIRST ENTRY EXPERIENCE & SUCCESS CRITERIA
  // =========================================================================
  describe("1. Outcome-First Entry & Semantic Goal Decomposition", () => {
    it("should create a desired outcome with semantic criteria and milestone sequence", async () => {
      const outcome = await outcomeService.createOutcome({
        title: "Increase qualified leads by 30%",
        description: "Scale high-intent buyer acquisition through optimized positioning and automated follow-ups",
        organizationId: orgA,
        userId,
        targetMetric: { name: "Qualified Leads", targetValue: "+30%" },
        successCriteria: [
          "+30% qualified lead volume",
          "Maintain lead qualification quality",
          "Verified against current business telemetry",
        ],
      });

      expect(outcome.outcomeId).toBeDefined();
      expect(outcome.title).toBe("Increase qualified leads by 30%");
      expect(outcome.organizationId).toBe(orgA);
      expect(outcome.successCriteria.length).toBe(3);
      expect(outcome.targetMetric?.targetValue).toBe("+30%");
      expect(outcome.milestones.length).toBeGreaterThan(1);
      expect(outcome.milestones[0].title).toContain("Goal Understood");
      expect(outcome.status).toMatch(/READY|UNDERSTANDING|PLANNING/);
    });

    it("should dynamically derive required capabilities without hardcoding", async () => {
      const outcome = await outcomeService.createOutcome({
        title: "Optimize sales funnel conversion drop-offs and draft follow-up copy",
        organizationId: orgA,
        userId,
      });

      expect(outcome.requiredCapabilities).toContain("funnel_architecture");
      expect(outcome.requiredCapabilities).toContain("copywriting");
      expect(outcome.assignedWorkers.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 2. ROBOT WORKFORCE IDENTITY & VISUAL LAYER
  // =========================================================================
  describe("2. Robot Workforce Identity System", () => {
    it("should register all 10 specialist workers and ELMO with consistent robot identities", () => {
      const robots = robotService.getAllRobots();
      expect(robots.length).toBe(11);

      const elmo = robotService.getRobotByName("ELMO");
      expect(elmo?.role).toBe("Executive Intelligence");
      expect(elmo?.workerId).toBe("elmo-orchestrator");

      const nova = robotService.getRobotByName("NOVA");
      expect(nova?.role).toBe("Research Worker");
      expect(nova?.workerId).toBe("research-worker");

      const atlas = robotService.getRobotByName("ATLAS");
      expect(atlas?.role).toBe("Analytics Worker");
      expect(atlas?.workerId).toBe("analytics-worker");

      const grow = robotService.getRobotByName("GROW");
      expect(grow?.role).toBe("Marketing Worker");

      const copy = robotService.getRobotByName("COPY");
      expect(copy?.role).toBe("Copywriting Worker");

      const sales = robotService.getRobotByName("SALES");
      expect(sales?.role).toBe("Sales Worker");

      const codex = robotService.getRobotByName("CODEX");
      expect(codex?.role).toBe("Web & Coding Worker");

      const ops = robotService.getRobotByName("OPS");
      expect(ops?.role).toBe("Operations Worker");

      const strategy = robotService.getRobotByName("STRATEGY");
      expect(strategy?.role).toBe("Strategy Worker");

      const automation = robotService.getRobotByName("AUTOMATION");
      expect(automation?.role).toBe("Automation Worker");

      const support = robotService.getRobotByName("SUPPORT");
      expect(support?.role).toBe("Support Worker");
    });

    it("should resolve robots by workerId, robotId, or name", () => {
      expect(robotService.resolveRobot("research-worker")?.displayName).toBe("NOVA");
      expect(robotService.resolveRobot("analytics-agent")?.displayName).toBe("ATLAS");
      expect(robotService.resolveRobot("robot-codex")?.displayName).toBe("CODEX");
      expect(robotService.resolveRobot("STRATEGY")?.workerId).toBe("strategy-worker");
    });
  });

  // =========================================================================
  // 3. ROBOT STRUCTURED INPUT, OUTPUT & LIVE WORKING STATES
  // =========================================================================
  describe("3. Structured Input, Working States & Tool Telemetry", () => {
    it("should expose visible structured input on a robot", () => {
      robotService.setRobotStructuredInput("robot-nova", {
        objective: "Identify causes for qualified lead decline in Malaysia market",
        context: ["Company Brain", "Recent campaign data", "Previous verified findings"],
        constraints: ["Last 30 days", "Malaysia market"],
        expectedOutput: "3 verified root causes for conversion decline",
      });

      const nova = robotService.getRobotByName("NOVA");
      expect(nova?.structuredInput?.objective).toContain("qualified lead decline");
      expect(nova?.structuredInput?.context).toContain("Company Brain");
      expect(nova?.structuredInput?.constraints).toContain("Malaysia market");
    });

    it("should record tool usage while strictly sanitizing sensitive data", () => {
      const toolUsage = robotService.recordToolUsage(
        "robot-atlas",
        "get_analytics_summary",
        "Analytics Summary Query",
        "RUNNING",
        "Executed query with apiKey=sk_live_secret1234567890abcdef and postgresql://user:pass@db.internal:5432/main"
      );

      expect(toolUsage?.toolId).toBe("get_analytics_summary");
      expect(toolUsage?.sanitizedSummary).not.toContain("sk_live_secret1234567890abcdef");
      expect(toolUsage?.sanitizedSummary).not.toContain("postgresql://user:pass@db.internal:5432/main");
      expect(toolUsage?.sanitizedSummary).toContain("[REDACTED]");
    });

    it("should record structured output and verification upon task completion", () => {
      robotService.setRobotStructuredOutput(
        "robot-nova",
        {
          findings: [
            "Lead volume dropped 18% due to ad fatigue",
            "Landing page drop-off highest on mobile checkout",
          ],
          evidence: ["Funnel telemetry", "Company Brain"],
          verificationPassed: true,
          artifactTitle: "Lead Decline Research Report",
        },
        { passed: true, details: "Verified against business telemetry", verifier: "OutcomeVerificationService" }
      );

      const nova = robotService.getRobotByName("NOVA");
      expect(nova?.status).toBe("COMPLETE");
      expect(nova?.workingPhase).toBe("COMPLETED");
      expect(nova?.structuredOutput?.findings.length).toBe(2);
      expect(nova?.verification?.passed).toBe(true);
    });
  });

  // =========================================================================
  // 4. CRITICAL PRINCIPLE: WORKER COMPLETE ≠ OUTCOME COMPLETE
  // =========================================================================
  describe("4. Critical Boundary: Worker Complete ≠ Outcome Complete", () => {
    it("should keep parent outcome status as EXECUTING when individual workers complete", async () => {
      const outcome = await outcomeService.createOutcome({
        title: "Increase qualified leads by 30%",
        organizationId: orgA,
        userId,
      });

      outcomeService.startExecution(outcome.outcomeId, orgA);
      expect(outcome.status).toBe("EXECUTING");

      // Worker NOVA completes step
      const updatedOutcome = outcomeService.completeWorkerStep(
        outcome.outcomeId,
        orgA,
        "NOVA",
        undefined,
        "ATLAS"
      );

      // NOVA is complete, but parent outcome MUST REMAIN EXECUTING
      const nova = robotService.getRobotByName("NOVA");
      expect(nova?.status).toBe("COMPLETE");
      expect(updatedOutcome.status).toBe("EXECUTING");
      expect(updatedOutcome.status).not.toBe("ACHIEVED");
    });
  });

  // =========================================================================
  // 5. ROBOT-TO-ROBOT HANDOFF & COMMUNICATION
  // =========================================================================
  describe("5. Visible Robot-to-Robot Handoff Experience", () => {
    it("should record visible handoff from NOVA to ATLAS with structured findings", () => {
      const handoffRecorded = robotService.recordHandoff(
        "NOVA",
        "ATLAS",
        "Passed verified lead decline findings for funnel metric correlation."
      );

      expect(handoffRecorded).toBe(true);
      const nova = robotService.getRobotByName("NOVA");
      expect(nova?.handoffState?.toRobotId).toBe("robot-atlas");

      const messages = robotService.getMessages();
      expect(messages.some((m) => m.eventType === "HANDOFF" && m.fromRobotName === "NOVA")).toBe(true);
    });
  });

  // =========================================================================
  // 6. HUMAN APPROVAL GATES
  // =========================================================================
  describe("6. Human Approval Flow", () => {
    it("should support human approval clearance", async () => {
      const outcome = await outcomeService.createOutcome({
        title: "Deploy external marketing email blast to 5000 leads",
        organizationId: orgA,
        userId,
      });

      // Simulate waiting for approval
      outcome.status = "WAITING";

      const approved = outcomeService.approveOutcome(outcome.outcomeId, orgA);
      expect(approved.status).toBe("READY");
    });

    it("should support human rejection of high-risk actions", async () => {
      const outcome = await outcomeService.createOutcome({
        title: "High impact strategic restructuring",
        organizationId: orgA,
        userId,
      });

      outcome.status = "WAITING";
      const rejected = outcomeService.rejectOutcome(outcome.outcomeId, orgA, "Budget constraints");
      expect(rejected.status).toBe("CANCELLED");
    });
  });

  // =========================================================================
  // 7. OUTCOME VERIFICATION & PARTIAL ACHIEVEMENT
  // =========================================================================
  describe("7. Outcome Verification & Target Evaluation", () => {
    it("should mark outcome as ACHIEVED when target metrics and criteria are fully met", async () => {
      const outcome = await outcomeService.createOutcome({
        title: "Increase qualified leads by 30%",
        organizationId: orgA,
        userId,
        targetMetric: { name: "Qualified Leads", targetValue: "+30%" },
        successCriteria: [
          "+30% qualified lead volume",
          "Maintain lead quality benchmark",
        ],
      });

      const verified = outcomeService.verifyOutcome(outcome.outcomeId, orgA, {
        currentValue: "+32%",
        criteriaResults: [
          { criterion: "+30% qualified lead volume", passed: true },
          { criterion: "Maintain lead quality benchmark", passed: true },
        ],
        details: "Achieved +32% lead volume with zero quality degradation.",
      });

      expect(verified.status).toBe("ACHIEVED");
      expect(verified.verification?.verified).toBe(true);
      expect(verified.targetMetric?.currentValue).toBe("+32%");
    });

    it("should mark outcome as PARTIALLY_ACHIEVED with clear diagnostic explanation when secondary criteria fail", async () => {
      const outcome = await outcomeService.createOutcome({
        title: "Increase qualified leads by 30%",
        organizationId: orgA,
        userId,
        targetMetric: { name: "Qualified Leads", targetValue: "+30%" },
        successCriteria: [
          "+30% qualified lead volume",
          "Maintain sub-5-minute lead response time",
        ],
      });

      const verified = outcomeService.verifyOutcome(outcome.outcomeId, orgA, {
        currentValue: "+18%",
        criteriaResults: [
          { criterion: "+30% qualified lead volume", passed: false },
          { criterion: "Maintain sub-5-minute lead response time", passed: true },
        ],
        details: "Volume grew +18% but did not reach the full +30% stretch target.",
      });

      expect(verified.status).toBe("PARTIALLY_ACHIEVED");
      expect(verified.verification?.verified).toBe(false);
      expect(verified.explanation?.whatAchieved).toContain("Maintain sub-5-minute lead response time");
      expect(verified.explanation?.whatRemains).toContain("+30% qualified lead volume");
      expect(verified.explanation?.whyPartial).toContain("+18%");
    });
  });

  // =========================================================================
  // 8. ARTIFACT INTEGRATION & MULTI-TENANT ISOLATION
  // =========================================================================
  describe("8. Artifacts & Multi-Tenant Boundary", () => {
    it("should attach governed artifacts to the outcome", async () => {
      const outcome = await outcomeService.createOutcome({
        title: "Formulate market positioning strategy",
        organizationId: orgA,
        userId,
      });

      const artifact = artifactService.createArtifact({
        artifactType: "STRATEGY_PLAN",
        title: "Regional Expansion Strategy",
        description: "Prioritized market penetration roadmap",
        sourceWorker: "strategy-worker",
        sourceTask: "step-1",
        organizationId: orgA,
        content: "# Expansion Roadmap\n1. Target tier-1 cities",
      });

      outcomeService.completeWorkerStep(outcome.outcomeId, orgA, "STRATEGY", artifact);

      const updated = outcomeService.getOutcome(outcome.outcomeId, orgA);
      expect(updated?.artifacts.length).toBe(1);
      expect(updated?.artifacts[0].title).toBe("Regional Expansion Strategy");
    });

    it("should enforce strict tenant boundary and prevent cross-tenant outcome access", async () => {
      const outcomeA = await outcomeService.createOutcome({
        title: "Confidential Organization A Plan",
        organizationId: orgA,
        userId,
      });

      // Tenant B queries Tenant A's outcome
      const crossTenantFetch = outcomeService.getOutcome(outcomeA.outcomeId, orgB);
      expect(crossTenantFetch).toBeUndefined();
    });
  });
});
