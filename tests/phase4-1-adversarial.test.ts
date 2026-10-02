import { describe, it, expect, beforeEach } from "vitest";
import { OutcomeService } from "../src/services/agentic/outcome.service";
import { RobotIdentityService } from "../src/services/agentic/robot-identity.service";
import { AgentRegistryService } from "../src/services/agentic/agent-registry.service";
import { WorkforceArtifactService } from "../src/services/agentic/workforce-artifact.service";

describe("ELMO Phase 4.1 — Adversarial Workforce UX Audits", () => {
  const orgAlpha = "11111111-1111-1111-1111-111111111111";
  const orgBeta = "22222222-2222-2222-2222-222222222222";
  const testUser = "adversarial-tester";

  let outcomeService: OutcomeService;
  let robotService: RobotIdentityService;
  let agentRegistry: AgentRegistryService;
  let artifactService: WorkforceArtifactService;

  beforeEach(() => {
    OutcomeService.resetInstance();
    RobotIdentityService.resetInstance();
    AgentRegistryService.resetInstance();
    WorkforceArtifactService.resetInstance();

    outcomeService = OutcomeService.getInstance();
    robotService = RobotIdentityService.getInstance();
    agentRegistry = AgentRegistryService.getInstance();
    artifactService = WorkforceArtifactService.getInstance();
  });

  // SCENARIO 1: Worker claims completion without execution
  it("SCENARIO 1: False completion claim — Outcome cannot be achieved without passing verification", async () => {
    const outcome = await outcomeService.createOutcome({
      title: "Launch conversion campaign",
      organizationId: orgAlpha,
      userId: testUser,
      successCriteria: ["Conversion rate >= 3%", "Zero fatal exceptions"],
    });

    outcomeService.startExecution(outcome.outcomeId, orgAlpha);

    // Attempting to finalize outcome without meeting criteria fails
    const verified = outcomeService.verifyOutcome(outcome.outcomeId, orgAlpha, {
      currentValue: "0%",
      criteriaResults: [
        { criterion: "Conversion rate >= 3%", passed: false },
        { criterion: "Zero fatal exceptions", passed: true },
      ],
      details: "Campaign produced zero traffic.",
    });

    expect(verified.status).not.toBe("ACHIEVED");
    expect(verified.status).toBe("PARTIALLY_ACHIEVED");
  });

  // SCENARIO 2: Robot displays fake progress
  it("SCENARIO 2: Fake progress prevention — Progress is strictly milestone-grounded", async () => {
    const outcome = await outcomeService.createOutcome({
      title: "Scale qualified leads",
      organizationId: orgAlpha,
      userId: testUser,
    });

    // Initial state has only the first milestone completed
    const completedInitial = outcome.milestones.filter((m) => m.status === "COMPLETED").length;
    expect(completedInitial).toBe(1);

    // Milestones do not advance autonomously without actual worker completion
    const fetchOutcome = outcomeService.getOutcome(outcome.outcomeId, orgAlpha);
    expect(fetchOutcome?.milestones.filter((m) => m.status === "COMPLETED").length).toBe(1);
  });

  // SCENARIO 3: Outcome marked complete when acceptance criteria fail
  it("SCENARIO 3: Acceptance criteria failure — Fails safely and does not grant ACHIEVED status", async () => {
    const outcome = await outcomeService.createOutcome({
      title: "Increase revenue by 40%",
      organizationId: orgAlpha,
      userId: testUser,
      successCriteria: ["Revenue growth >= 40%"],
    });

    const failedOutcome = outcomeService.verifyOutcome(outcome.outcomeId, orgAlpha, {
      currentValue: "-5%",
      criteriaResults: [{ criterion: "Revenue growth >= 40%", passed: false }],
      details: "Revenue declined during test period.",
    });

    expect(failedOutcome.status).toBe("FAILED");
    expect(failedOutcome.verification?.verified).toBe(false);
  });

  // SCENARIO 4: Worker output shown without verification
  it("SCENARIO 4: Unverified worker output — Verification passed flag remains false until cleared", () => {
    robotService.setRobotStructuredOutput("robot-nova", {
      findings: ["Unverified speculative assumption"],
      evidence: [],
      verificationPassed: false,
    });

    const nova = robotService.getRobotByName("NOVA");
    expect(nova?.structuredOutput?.verificationPassed).toBe(false);
  });

  // SCENARIO 5: Handoff shown when backend handoff did not occur
  it("SCENARIO 5: Fabricated handoff — Robot handoff state requires valid sender and receiver", () => {
    const invalidHandoff = robotService.recordHandoff(
      "NON_EXISTENT_WORKER",
      "ATLAS",
      "Bogus handoff"
    );

    expect(invalidHandoff).toBe(false);
    const atlas = robotService.getRobotByName("ATLAS");
    expect(atlas?.handoffState).toBeUndefined();
  });

  // SCENARIO 6: Tool displayed as used when it was not used
  it("SCENARIO 6: Fabricated tool usage — Only actual tool executions are registered in telemetry", () => {
    const nova = robotService.getRobotByName("NOVA");
    expect(nova?.recentTools.length).toBe(0);

    robotService.recordToolUsage("NOVA", "search_knowledge", "Knowledge Search", "SUCCESS", "Grounded query");
    expect(nova?.recentTools.length).toBe(1);
    expect(nova?.recentTools[0].toolId).toBe("search_knowledge");
  });

  // SCENARIO 7: Approval bypass
  it("SCENARIO 7: Approval bypass — Cannot transition to READY from WAITING without approval clearance", async () => {
    const outcome = await outcomeService.createOutcome({
      title: "Deploy external marketing email blast to 5000 leads",
      organizationId: orgAlpha,
      userId: testUser,
    });

    outcome.status = "WAITING";

    // Attempting to start execution while WAITING for approval throws error
    expect(() => outcomeService.startExecution(outcome.outcomeId, orgAlpha)).toThrow();

    // After approval, execution is permitted
    outcomeService.approveOutcome(outcome.outcomeId, orgAlpha);
    expect(outcome.status).toBe("READY");
    expect(() => outcomeService.startExecution(outcome.outcomeId, orgAlpha)).not.toThrow();
  });

  // SCENARIO 8: Blocked outcome shown as achieved
  it("SCENARIO 8: Blocked outcome — Cannot claim execution or achievement when blocked", async () => {
    const outcome = await outcomeService.createOutcome({
      title: "Follow up via whatsapp_messaging tool",
      organizationId: orgAlpha,
      userId: testUser,
    });

    // Simulate blocked state due to missing integration
    outcome.status = "BLOCKED";
    outcome.blocker = {
      reason: "MISSING_CAPABILITY",
      whatCompleted: ["Workflow designed"],
      whatIsMissing: ["WhatsApp tool"],
      nextAction: "Connect an approved WhatsApp integration",
    };

    expect(() => outcomeService.startExecution(outcome.outcomeId, orgAlpha)).toThrow(/blocked/i);
    expect(outcome.status).toBe("BLOCKED");
  });

  // SCENARIO 9: Partial result shown as full success
  it("SCENARIO 9: Partial result truthfulness — Differentiates PARTIALLY_ACHIEVED from ACHIEVED", async () => {
    const outcome = await outcomeService.createOutcome({
      title: "Increase qualified leads by 30%",
      organizationId: orgAlpha,
      userId: testUser,
      targetMetric: { name: "Qualified Leads", targetValue: "+30%" },
      successCriteria: ["Primary: +30% volume", "Secondary: Sub-5-minute SLA"],
    });

    const partialOutcome = outcomeService.verifyOutcome(outcome.outcomeId, orgAlpha, {
      currentValue: "+18%",
      criteriaResults: [
        { criterion: "Primary: +30% volume", passed: false },
        { criterion: "Secondary: Sub-5-minute SLA", passed: true },
      ],
      details: "Met speed SLA but reached +18% volume vs +30% target.",
    });

    expect(partialOutcome.status).toBe("PARTIALLY_ACHIEVED");
    expect(partialOutcome.status).not.toBe("ACHIEVED");
    expect(partialOutcome.explanation?.whyPartial).toBeDefined();
  });

  // SCENARIO 10: Worker selected through hardcoded keyword routing
  it("SCENARIO 10: Anti-hardcoding — Uses registry capabilities rather than keyword routing", () => {
    const workers = agentRegistry.findWorkersForCapabilities(["market_research"]);
    expect(workers.length).toBeGreaterThan(0);
    expect(workers.some((w) => w.id.includes("research"))).toBe(true);

    // Unregistered arbitrary capability returns empty set rather than default guess
    const unknown = agentRegistry.findWorkersForCapabilities(["quantum_teleportation_capability"]);
    expect(unknown.length).toBe(0);
  });

  // SCENARIO 11: Robot accesses unauthorized organization data
  it("SCENARIO 11: Cross-tenant data isolation — Outlawed access returns undefined", async () => {
    const outcomeA = await outcomeService.createOutcome({
      title: "Confidential Strategy Org A",
      organizationId: orgAlpha,
      userId: testUser,
    });

    const crossAccess = outcomeService.getOutcome(outcomeA.outcomeId, orgBeta);
    expect(crossAccess).toBeUndefined();
  });

  // SCENARIO 12: Robot exposes sensitive tool information
  it("SCENARIO 12: Tool sanitization — API keys, passwords, and db credentials are scrubbed", () => {
    const toolLog = robotService.recordToolUsage(
      "CODEX",
      "build_project",
      "Build Project",
      "SUCCESS",
      "Build completed with DATABASE_URL=postgresql://root:p@ssw0rd123@prod.internal:5432/db and bearer token bearer_token_secret_9999888877776666"
    );

    expect(toolLog?.sanitizedSummary).not.toContain("p@ssw0rd123");
    expect(toolLog?.sanitizedSummary).not.toContain("bearer_token_secret_9999888877776666");
    expect(toolLog?.sanitizedSummary).toContain("[REDACTED]");
  });

  // SCENARIO 13: Voice reports a result that was not achieved
  it("SCENARIO 13: Voice truthfulness — Grounded in actual outcome verification state", async () => {
    const outcome = await outcomeService.createOutcome({
      title: "Improve conversion rate",
      organizationId: orgAlpha,
      userId: testUser,
    });

    // When status is EXECUTING, outcome is not falsely reported as achieved
    outcomeService.startExecution(outcome.outcomeId, orgAlpha);
    const activeOutcome = outcomeService.getOutcome(outcome.outcomeId, orgAlpha);
    expect(activeOutcome?.status).toBe("EXECUTING");
    expect(activeOutcome?.verification?.verified).toBeUndefined();
  });

  // SCENARIO 14: Fake worker activity generated for UX purposes
  it("SCENARIO 14: Fake activity prevention — Robot recentTools is empty until real tool executes", () => {
    const codex = robotService.getRobotByName("CODEX");
    expect(codex?.recentTools.length).toBe(0);

    robotService.recordToolUsage("CODEX", "code_validate", "Validate Code", "SUCCESS");
    expect(codex?.recentTools.length).toBe(1);
    expect(codex?.recentTools[0].toolName).toBe("Validate Code");
  });
});
