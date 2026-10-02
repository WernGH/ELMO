import { describe, it, expect, beforeEach } from "vitest";
import { OutcomeService } from "../src/services/agentic/outcome.service";
import { RobotIdentityService } from "../src/services/agentic/robot-identity.service";
import { WorkforceRegistryService } from "../src/services/agentic/workforce-registry.service";
import { AgentRegistryService } from "../src/services/agentic/agent-registry.service";
import { WorkforceArtifactService } from "../src/services/agentic/workforce-artifact.service";
import { ApprovalService } from "../src/services/approval.service";
import { WorkforceArtifact } from "../src/services/agentic/types/agentic.types";

describe("ELMO Phase 4.1 — Section W: End-to-End Outcome Journey & Scope 42 Verification", () => {
  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "user-exec-1";

  let outcomeService: OutcomeService;
  let robotService: RobotIdentityService;
  let workforceRegistry: WorkforceRegistryService;
  let artifactService: WorkforceArtifactService;

  beforeEach(() => {
    WorkforceRegistryService.resetInstance();
    OutcomeService.resetInstance();
    RobotIdentityService.resetInstance();
    AgentRegistryService.resetInstance();
    WorkforceArtifactService.resetInstance();

    workforceRegistry = WorkforceRegistryService.getInstance();
    outcomeService = OutcomeService.getInstance();
    robotService = RobotIdentityService.getInstance();
    artifactService = WorkforceArtifactService.getInstance();
  });

  // ==========================================================================
  // Section A1 & A3: Robot Identity & Status Mapping Unit Tests
  // ==========================================================================
  describe("A1 & A3: Robot Identity & Status Mapping", () => {
    it("correctly maps all 10 specialist workers + ELMO to unique robot identities", () => {
      const robots = robotService.getAllRobots();
      expect(robots.length).toBe(11);

      const expectedRobots = [
        { robotId: "robot-elmo", name: "ELMO", role: "Executive Intelligence" },
        { robotId: "robot-nova", name: "NOVA", role: "Research Worker" },
        { robotId: "robot-atlas", name: "ATLAS", role: "Analytics Worker" },
        { robotId: "robot-grow", name: "GROW", role: "Marketing Worker" },
        { robotId: "robot-copy", name: "COPY", role: "Copywriting Worker" },
        { robotId: "robot-sales", name: "SALES", role: "Sales Worker" },
        { robotId: "robot-codex", name: "CODEX", role: "Web & Coding Worker" },
        { robotId: "robot-ops", name: "OPS", role: "Operations Worker" },
        { robotId: "robot-strategy", name: "STRATEGY", role: "Strategy Worker" },
        { robotId: "robot-automation", name: "AUTOMATION", role: "Automation Worker" },
        { robotId: "robot-support", name: "SUPPORT", role: "Support Worker" },
      ];

      for (const expected of expectedRobots) {
        const found = robotService.getRobotById(expected.robotId);
        expect(found).toBeDefined();
        expect(found?.displayName).toBe(expected.name);
        expect(found?.role).toBe(expected.role);

        // Name resolution
        expect(robotService.getRobotByName(expected.name)?.robotId).toBe(expected.robotId);
      }
    });

    it("supports all required conceptual worker execution states without second state machine", () => {
      const robot = robotService.getRobotByName("NOVA")!;

      const states = [
        "READY",
        "THINKING",
        "WORKING",
        "USING_TOOL",
        "WAITING",
        "VERIFYING",
        "COMPLETED",
        "BLOCKED",
        "ERROR",
        "APPROVAL_REQUIRED",
      ] as const;

      for (const st of states) {
        const success = robotService.setRobotStatus(robot.robotId, st, "ANALYZING");
        expect(success).toBe(true);
        const updated = robotService.getRobotById(robot.robotId)!;
        expect(updated.status).toBe(st);
      }
    });

    it("sanitizes tool data and logs real tool activity events", () => {
      const nova = robotService.getRobotByName("NOVA")!;

      // Using tool with potential sensitive data
      const toolUsage = robotService.recordToolUsage(
        nova.robotId,
        "tool-market-search",
        "Market Search Tool",
        "SUCCESS",
        "Fetched leads with apiKey=secret_live_key_998877665544 and postgresql://user:pass@db:5432/leads"
      );

      expect(toolUsage).not.toBeNull();
      expect(toolUsage?.sanitizedSummary).not.toContain("secret_live_key_998877665544");
      expect(toolUsage?.sanitizedSummary).toContain("[REDACTED]");
      expect(toolUsage?.sanitizedSummary).not.toContain("postgresql://user:pass@db:5432/leads");
      expect(toolUsage?.sanitizedSummary).toContain("[REDACTED_DB_URL]");

      // Check activity logs
      const activities = workforceRegistry.getWorkerActivity(orgId);
      const toolEvent = activities.find((a) => a.eventType === "WORKER_TOOL_COMPLETED");
      expect(toolEvent).toBeDefined();
    });
  });

  // ==========================================================================
  // Section W: Complete 17-Step Outcome Journey Integration Test
  // ==========================================================================
  describe("Section W: 17-Step Outcome Journey (I want to increase qualified leads)", () => {
    it("successfully navigates all 17 steps from intent to verified outcome achievement", async () => {
      // Step 1: User states outcome -> System creates outcome
      const outcome = await outcomeService.createOutcome({
        title: "Increase qualified leads by 30%",
        description: "Scale organic and funnel inbound lead pipeline with verified quality metrics.",
        desiredResult: "+30% qualified leads within 30 days",
        constraints: ["Must adhere to brand guidelines", "Zero spam outbound"],
        organizationId: orgId,
        userId,
        targetMetric: {
          name: "Qualified Leads",
          targetValue: "+30%",
          currentValue: "0%",
          unit: "Monthly Growth",
        },
      });

      expect(outcome.outcomeId).toBeDefined();
      expect(outcome.status).toBe("READY");

      // Step 2: Defines / loads success criteria
      expect(outcome.successCriteria.length).toBeGreaterThan(0);
      expect(outcome.successCriteria.some((c) => c.includes("30%"))).toBe(true);

      // Step 3: Checks workforce readiness (pre-flight check executed)
      expect(outcome.blocker).toBeUndefined();

      // Step 4: Creates dynamic execution plan
      expect(outcome.executionPlanId).toBeDefined();
      expect(outcome.executionPlan).toBeDefined();
      expect(outcome.milestones.length).toBeGreaterThan(2);

      // Step 5: Assigns specialist worker
      const execution = outcomeService.startExecution(outcome.outcomeId, orgId);
      expect(execution.status).toBe("EXECUTING");
      expect(["SALES", "STRATEGY", "RESEARCH"]).toContain(execution.currentWorkerId);

      // Step 6: Research executes (NOVA working)
      const nova = robotService.getRobotByName("NOVA")!;
      robotService.setRobotStatus(nova.robotId, "WORKING", "RESEARCHING", {
        currentOutcomeId: outcome.outcomeId,
        currentTask: "Identify root causes of qualification bottlenecks",
      });
      robotService.recordToolUsage(nova.robotId, "tool-brain-query", "Company Brain Query", "SUCCESS");

      // Step 7: Research produces artifact
      const researchArtifact = artifactService.createArtifact({
        artifactType: "RESEARCH_REPORT",
        title: "Lead Flow & Drop-off Root Cause Analysis",
        description: "Verified analysis of lead capture form friction points and buyer personas.",
        sourceWorker: nova.workerId,
        sourceTask: "Research qualification bottlenecks",
        organizationId: orgId,
        content: "# Lead Flow Research\nFriction identified in form length.",
        structuredData: { frictionScore: 8.5 },
        evidence: ["Brain document: Sales Funnel Q3", "Telemetry: 42% mobile bounce on step 3"],
      });

      // Step 8: Research is verified
      const verifiedArtifact = artifactService.verifyArtifact(
        researchArtifact.artifactId,
        orgId,
        {
          verified: true,
          verifier: "ELMO Verification Engine",
          checks: ["Persona criteria met", "Empirical data grounded"],
          technicalPassed: true,
          businessPassed: true,
        }
      );
      expect(verifiedArtifact.status).toBe("VERIFIED");

      // Step 9: Handoff created from NOVA -> ATLAS
      const atlas = robotService.getRobotByName("ATLAS")!;
      const handoffContract = workforceRegistry.createWorkerHandoff({
        organizationId: orgId,
        executionId: outcome.outcomeId,
        fromWorkerId: nova.workerId,
        toWorkerId: atlas.workerId,
        objective: "Analyze conversion attribution metrics based on research findings",
        completedWork: "Compiled verified lead friction evidence and persona criteria.",
        requiredNextAction: "Compute baseline conversion drop-off rates and segment by channel.",
        outputs: { findingsCount: 3 },
        verificationStatus: "VERIFIED",
      });
      expect(handoffContract.verificationStatus).toBe("VERIFIED");

      // Step 10: Analytics Worker (ATLAS) receives handoff
      outcomeService.completeWorkerStep(
        outcome.outcomeId,
        orgId,
        nova.displayName,
        verifiedArtifact,
        atlas.displayName
      );

      // Step 11: Analytics executes
      robotService.recordToolUsage(atlas.robotId, "tool-analytics-eval", "Analytics Metric Evaluator", "SUCCESS");
      const analyticsArtifact = artifactService.createArtifact({
        artifactType: "ANALYTICS_REPORT",
        title: "Channel Lead Attribution & Funnel Model",
        description: "Attribution models showing 68% conversion uplift potential on mobile simplification.",
        sourceWorker: atlas.workerId,
        sourceTask: "Conversion analysis",
        organizationId: orgId,
        content: "# Attribution Model\nMobile optimization yields +32% lead velocity.",
        structuredData: { upliftPotential: 0.32 },
        evidence: ["GA4 telemetry", "PostHog funnel events"],
      });

      // Step 12: Strategy Worker receives verified information
      const strategy = robotService.getRobotByName("STRATEGY")!;
      outcomeService.completeWorkerStep(
        outcome.outcomeId,
        orgId,
        atlas.displayName,
        analyticsArtifact,
        strategy.displayName
      );

      // Step 13: Strategy executes
      robotService.recordToolUsage(strategy.robotId, "tool-strategic-planner", "Strategy Synthesis Tool", "SUCCESS");
      const strategyArtifact = artifactService.createArtifact({
        artifactType: "STRATEGY_PLAN",
        title: "Qualified Lead Optimization Plan",
        description: "Four-phase implementation plan: mobile form streamlining, value prop copy, follow-up automation.",
        sourceWorker: strategy.workerId,
        sourceTask: "Strategic lead roadmap",
        organizationId: orgId,
        content: "# Strategy Plan\nStreamlined mobile intake and instant automated SMS follow-up.",
        structuredData: { phases: 4 },
        evidence: ["Research Findings", "Analytics Uplift Model"],
      });

      // Step 14: Marketing / Copy / Automation workers execute
      outcomeService.completeWorkerStep(
        outcome.outcomeId,
        orgId,
        strategy.displayName,
        strategyArtifact
      );

      // Step 15: ELMO supervises
      const messages = robotService.getMessages(outcome.outcomeId);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.some((m) => m.fromRobotName === "ELMO")).toBe(true);

      // Verify intermediate state: WORKER COMPLETE IS NOT OUTCOME COMPLETE!
      const midOutcome = outcomeService.getOutcome(outcome.outcomeId, orgId)!;
      expect(midOutcome.status).toBe("EXECUTING"); // Still executing!

      // Step 16: Outcome is verified against criteria
      const verifiedOutcome = outcomeService.verifyOutcome(outcome.outcomeId, orgId, {
        currentValue: "+32%",
        details: "Business telemetry indicates +32% qualified lead growth over 30 days, exceeding target of +30%.",
        criteriaResults: outcome.successCriteria.map((c) => ({
          criterion: c,
          passed: true,
        })),
      });

      // Step 17: Final result is displayed
      expect(verifiedOutcome.status).toBe("ACHIEVED");
      expect(verifiedOutcome.verification?.verified).toBe(true);
      expect(verifiedOutcome.targetMetric?.currentValue).toBe("+32%");
      expect(verifiedOutcome.explanation?.whatAchieved.length).toBeGreaterThan(0);
      expect(verifiedOutcome.explanation?.whatRemains.length).toBe(0);

      // Section Q: Unified Read Model inspection
      const unifiedWorkspace = await outcomeService.getUnifiedWorkspace(outcome.outcomeId, orgId);
      expect(unifiedWorkspace).not.toBeNull();
      expect(unifiedWorkspace?.outcome.outcomeId).toBe(outcome.outcomeId);
      expect(unifiedWorkspace?.workers.length).toBeGreaterThan(0);
      expect(unifiedWorkspace?.activities.length).toBeGreaterThan(0);
      expect(unifiedWorkspace?.artifacts.length).toBe(3);
      expect(unifiedWorkspace?.verification?.verified).toBe(true);
      expect(unifiedWorkspace?.result).toBeDefined();
    });
  });

  // ==========================================================================
  // Section V: Blocker, Partial, and Approval Authority Tests
  // ==========================================================================
  describe("Section V: Blocker, Partial Achievement, and Human Authority Gates", () => {
    it("handles partially achieved outcomes transparently without generic completion", () => {
      const outcome = outcomeService.getOutcome(
        "out-seed-1",
        "11111111-1111-1111-1111-111111111111"
      );

      // Create a test outcome with multiple criteria
      const testOutcome = {
        outcomeId: "out-partial-test",
        title: "Expand enterprise deals by 40%",
        organizationId: orgId,
        userId,
        status: "EXECUTING" as const,
        successCriteria: [
          "Enterprise ARR increases by 40%",
          "Win rate increases to 25%",
          "Average deal cycle decreases under 45 days",
        ],
        targetMetric: {
          name: "Enterprise ARR",
          targetValue: "+40%",
          currentValue: "+18%",
        },
        requiredCapabilities: ["sales_strategy"],
        assignedWorkers: ["SALES", "STRATEGY"],
        milestones: [],
        artifacts: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (outcomeService as any).outcomes.set(testOutcome.outcomeId, testOutcome);

      // Partial verification: ARR passed, Win rate passed, but deal cycle failed
      const result = outcomeService.verifyOutcome(testOutcome.outcomeId, orgId, {
        currentValue: "+18%",
        details: "ARR grew +18% (target +40%), deal cycle remained at 52 days.",
        criteriaResults: [
          { criterion: "Enterprise ARR increases by 40%", passed: false },
          { criterion: "Win rate increases to 25%", passed: true },
          { criterion: "Average deal cycle decreases under 45 days", passed: false },
        ],
      });

      expect(result.status).toBe("PARTIALLY_ACHIEVED");
      expect(result.verification?.verified).toBe(false);
      expect(result.verification?.criteriaMet.length).toBe(1);
      expect(result.verification?.criteriaUnmet.length).toBe(2);
      expect(result.explanation?.whatRemains).toContain("Enterprise ARR increases by 40%");
      expect(result.explanation?.whyPartial).toContain("+18%");
    });

    it("enforces human approval authority gate and prevents bypass", () => {
      const outcome = {
        outcomeId: "out-waiting-approval",
        title: "Send mass outreach campaign to 10,000 prospects",
        organizationId: orgId,
        userId,
        status: "WAITING" as const,
        successCriteria: ["Generate 50 replies"],
        requiredCapabilities: ["marketing_automation"],
        assignedWorkers: ["AUTOMATION"],
        milestones: [],
        artifacts: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (outcomeService as any).outcomes.set(outcome.outcomeId, outcome);

      // Trying to start execution directly must be rejected
      expect(() => {
        outcomeService.startExecution(outcome.outcomeId, orgId);
      }).toThrow(/awaiting human approval/);

      // Human approves
      const approved = outcomeService.approveOutcome(outcome.outcomeId, orgId);
      expect(approved.status).toBe("READY");

      // Now execution can start
      const started = outcomeService.startExecution(outcome.outcomeId, orgId);
      expect(started.status).toBe("EXECUTING");
    });

    it("verifies multi-tenant organization isolation (RLS)", () => {
      const outcome = {
        outcomeId: "out-org-a",
        title: "Private Corporate Strategy",
        organizationId: "org-a",
        userId: "user-a",
        status: "READY" as const,
        successCriteria: ["Confidential M&A analysis"],
        requiredCapabilities: ["strategic_planning"],
        assignedWorkers: ["STRATEGY"],
        milestones: [],
        artifacts: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (outcomeService as any).outcomes.set(outcome.outcomeId, outcome);

      // Org B user must NEVER be able to read Org A outcome
      const inaccessible = outcomeService.getOutcome("out-org-a", "org-b");
      expect(inaccessible).toBeUndefined();

      // Org A user can access it
      const accessible = outcomeService.getOutcome("out-org-a", "org-a");
      expect(accessible).toBeDefined();
      expect(accessible?.title).toBe("Private Corporate Strategy");
    });
  });
});
