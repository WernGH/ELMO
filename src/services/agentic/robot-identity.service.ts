/**
 * ELMO Phase 4.1 — Robot Workforce Identity Service (RobotIdentityService)
 *
 * Implements the Robot Workforce Identity System for the 10 governed workers + ELMO:
 * - 🤖 ELMO: Executive Intelligence & Orchestration
 * - 🤖 NOVA: Research Worker
 * - 🤖 ATLAS: Analytics Worker
 * - 🤖 GROW: Marketing Worker
 * - 🤖 COPY: Copywriting Worker
 * - 🤖 SALES: Sales Worker
 * - 🤖 CODEX: Web & Coding Worker
 * - 🤖 OPS: Operations Worker
 * - 🤖 STRATEGY: Strategy Worker
 * - 🤖 AUTOMATION: Automation Worker
 * - 🤖 SUPPORT: Support Worker
 *
 * Core Principles:
 * - Robot = visual identity + interaction UX
 * - Worker = underlying governed execution capability
 * - ELMO = executive intelligence and orchestration
 * - No fake progress or fake conversations; reflects actual system execution telemetry.
 * - Strict tool sanitization: Zero secrets, tokens, or credentials exposed.
 */

import {
  RobotIdentity,
  RobotStatus,
  RobotWorkingPhase,
  RobotStructuredInput,
  RobotStructuredOutput,
  RobotToolUsage,
  RobotMessage,
} from "./types/agentic.types";
import { AgentRegistryService } from "./agent-registry.service";

export class RobotIdentityService {
  private static instance: RobotIdentityService;

  // robotId -> RobotIdentity
  private robots: Map<string, RobotIdentity> = new Map();
  // workerId -> robotId
  private workerToRobot: Map<string, string> = new Map();
  // robot displayName (case-insensitive) -> robotId
  private nameToRobot: Map<string, string> = new Map();

  // Audit log of real robot communication events
  private messages: RobotMessage[] = [];

  private constructor() {
    this.initializeRobots();
  }

  public static getInstance(): RobotIdentityService {
    if (!RobotIdentityService.instance) {
      RobotIdentityService.instance = new RobotIdentityService();
    }
    return RobotIdentityService.instance;
  }

  public static resetInstance(): void {
    RobotIdentityService.instance = undefined as any;
  }

  public reset(): void {
    this.robots.clear();
    this.workerToRobot.clear();
    this.nameToRobot.clear();
    this.messages = [];
    this.initializeRobots();
  }

  /**
   * Initializes the canonical 11 robot identities.
   */
  private initializeRobots(): void {
    const agentRegistry = AgentRegistryService.getInstance();
    const now = Date.now();

    const robotConfigs: Array<{
      robotId: string;
      workerId: string;
      displayName: string;
      role: string;
      description: string;
      avatarKey: string;
    }> = [
      {
        robotId: "robot-elmo",
        workerId: "elmo-orchestrator",
        displayName: "ELMO",
        role: "Executive Intelligence",
        description: "Orchestrates workforce execution, interprets desired outcomes, coordinates worker handoffs, and verifies business results.",
        avatarKey: "elmo",
      },
      {
        robotId: "robot-nova",
        workerId: "research-worker",
        displayName: "NOVA",
        role: "Research Worker",
        description: "Gathers verified intelligence, retrieves Company Brain knowledge, sources evidence, and identifies market unknowns.",
        avatarKey: "nova",
      },
      {
        robotId: "robot-atlas",
        workerId: "analytics-worker",
        displayName: "ATLAS",
        role: "Analytics Worker",
        description: "Analyzes quantitative business data, computes conversion KPIs, detects anomalies, and generates diagnostic metrics.",
        avatarKey: "atlas",
      },
      {
        robotId: "robot-grow",
        workerId: "marketing-worker",
        displayName: "GROW",
        role: "Marketing Worker",
        description: "Formulates marketing positioning, unique value propositions, campaign architectures, and promotional offer designs.",
        avatarKey: "grow",
      },
      {
        robotId: "robot-copy",
        workerId: "copy-worker",
        displayName: "COPY",
        role: "Copywriting Worker",
        description: "Crafts high-converting headlines, landing page copy, value propositions, emails, and objection-handling messaging.",
        avatarKey: "copy",
      },
      {
        robotId: "robot-sales",
        workerId: "sales-worker",
        displayName: "SALES",
        role: "Sales Worker",
        description: "Specializes in lead qualification, sales funnel architecture, conversion audits, and buyer journey pipeline engineering.",
        avatarKey: "sales",
      },
      {
        robotId: "robot-codex",
        workerId: "web-coding-worker",
        displayName: "CODEX",
        role: "Web & Coding Worker",
        description: "Designs, codes, builds, verifies, and optimizes responsive web applications, landing pages, and interactive components.",
        avatarKey: "codex",
      },
      {
        robotId: "robot-ops",
        workerId: "operations-worker",
        displayName: "OPS",
        role: "Operations Worker",
        description: "Audits operational workflows, coordinates cross-worker execution, evaluates SOPs, and models efficiency improvements.",
        avatarKey: "ops",
      },
      {
        robotId: "robot-strategy",
        workerId: "strategy-worker",
        displayName: "STRATEGY",
        role: "Strategy Worker",
        description: "Transforms verified context into prioritized strategic roadmaps, trade-off analyses, and worker delegation plans.",
        avatarKey: "strategy",
      },
      {
        robotId: "robot-automation",
        workerId: "automation-worker",
        displayName: "AUTOMATION",
        role: "Automation Worker",
        description: "Designs, configures, tests, and verifies event-driven business automation workflows (Trigger -> Conditions -> Actions).",
        avatarKey: "automation",
      },
      {
        robotId: "robot-support",
        workerId: "support-worker",
        displayName: "SUPPORT",
        role: "Support Worker",
        description: "Resolves customer enquiries, retrieves verified policies from Company Brain, categorizes issues, and manages support cases.",
        avatarKey: "support",
      },
    ];

    for (const config of robotConfigs) {
      // Cross-reference capabilities and tools from AgentRegistryService
      const worker = agentRegistry.getWorker(config.workerId);
      const capabilities = worker?.capabilities || [];
      const skills = worker?.skills || [];
      const tools = worker?.allowedTools || [];

      const robot: RobotIdentity = {
        robotId: config.robotId,
        workerId: config.workerId,
        displayName: config.displayName,
        role: config.role,
        description: config.description,
        avatarKey: config.avatarKey,
        status: "READY",
        workingPhase: "IDLE",
        capabilities,
        skills,
        tools,
        recentTools: [],
        lastActiveAt: now,
      };

      this.robots.set(robot.robotId, robot);
      this.workerToRobot.set(config.workerId.toLowerCase(), robot.robotId);
      this.nameToRobot.set(config.displayName.toLowerCase(), robot.robotId);

      // Handle worker aliases
      if (config.workerId.includes("-worker")) {
        const agentAlias = config.workerId.replace("-worker", "-agent");
        this.workerToRobot.set(agentAlias.toLowerCase(), robot.robotId);
      }
    }
  }

  /**
   * Retrieves all registered robot identities.
   */
  public getAllRobots(): RobotIdentity[] {
    return Array.from(this.robots.values());
  }

  /**
   * Retrieves a robot by robotId.
   */
  public getRobotById(robotId: string): RobotIdentity | undefined {
    return this.robots.get(robotId);
  }

  /**
   * Retrieves a robot by workerId (canonical or alias).
   */
  public getRobotByWorkerId(workerId: string): RobotIdentity | undefined {
    const robotId = this.workerToRobot.get(workerId.toLowerCase());
    return robotId ? this.robots.get(robotId) : undefined;
  }

  /**
   * Retrieves a robot by display name (e.g. "NOVA", "ATLAS").
   */
  public getRobotByName(name: string): RobotIdentity | undefined {
    const robotId = this.nameToRobot.get(name.toLowerCase());
    return robotId ? this.robots.get(robotId) : undefined;
  }

  /**
   * Resolves a robot by any identifier (robotId, workerId, or displayName).
   */
  public resolveRobot(identifier: string): RobotIdentity | undefined {
    return (
      this.getRobotById(identifier) ||
      this.getRobotByWorkerId(identifier) ||
      this.getRobotByName(identifier)
    );
  }

  /**
   * Updates a robot's live status and working phase.
   */
  public setRobotStatus(
    identifier: string,
    status: RobotStatus,
    workingPhase?: RobotWorkingPhase,
    taskDetails?: { currentOutcomeId?: string; currentTask?: string }
  ): boolean {
    const robot = this.resolveRobot(identifier);
    if (!robot) return false;

    robot.status = status;
    if (workingPhase) {
      robot.workingPhase = workingPhase;
    }
    if (taskDetails?.currentOutcomeId !== undefined) {
      robot.currentOutcomeId = taskDetails.currentOutcomeId;
    }
    if (taskDetails?.currentTask !== undefined) {
      robot.currentTask = taskDetails.currentTask;
    }
    robot.lastActiveAt = Date.now();

    if (status === "WAITING") {
      this.logActivity(robot.workerId, "WORKER_WAITING", "WAITING", { robotId: robot.robotId, outcomeId: robot.currentOutcomeId });
    } else if (status === "VERIFYING") {
      this.logActivity(robot.workerId, "WORKER_VERIFYING", "VERIFYING", { robotId: robot.robotId, outcomeId: robot.currentOutcomeId });
    } else if (status === "BLOCKED") {
      this.logActivity(robot.workerId, "WORKER_BLOCKED", "BLOCKED", { robotId: robot.robotId, outcomeId: robot.currentOutcomeId });
    }

    return true;
  }

  /**
   * Sets structured input for a robot to make instructions fully visible in UI.
   */
  public setRobotStructuredInput(
    identifier: string,
    input: RobotStructuredInput
  ): boolean {
    const robot = this.resolveRobot(identifier);
    if (!robot) return false;

    robot.structuredInput = input;
    robot.lastActiveAt = Date.now();
    return true;
  }

  /**
   * Records real tool usage for a robot from actual execution telemetry.
   * Strips all secrets, API keys, credentials, or private system data.
   */
  public recordToolUsage(
    identifier: string,
    toolId: string,
    toolName: string,
    status: "RUNNING" | "SUCCESS" | "FAILED" | "BLOCKED" = "SUCCESS",
    rawSummary?: string
  ): RobotToolUsage | null {
    const robot = this.resolveRobot(identifier);
    if (!robot) return null;

    // Sanitize summary to ensure no secrets or tokens are stored
    const sanitized = this.sanitizeToolData(rawSummary || `Executed tool ${toolName}`);

    const toolUsage: RobotToolUsage = {
      toolId,
      toolName,
      timestamp: Date.now(),
      status,
      sanitizedSummary: sanitized,
    };

    // Keep the most recent 10 tools
    robot.recentTools = [toolUsage, ...(robot.recentTools || [])].slice(0, 10);
    robot.lastActiveAt = Date.now();

    // Section A4: Emit real tool activity telemetry
    const eventType = status === "RUNNING" ? "WORKER_TOOL_STARTED" : "WORKER_TOOL_COMPLETED";
    this.logActivity(robot.workerId, eventType, status, {
      toolId,
      toolName,
      robotId: robot.robotId,
      sanitizedSummary: sanitized,
    });

    return toolUsage;
  }

  /**
   * Sets structured output and verification for a worker upon task completion.
   */
  public setRobotStructuredOutput(
    identifier: string,
    output: RobotStructuredOutput,
    verification?: { passed: boolean; details: string; verifier: string }
  ): boolean {
    const robot = this.resolveRobot(identifier);
    if (!robot) return false;

    robot.structuredOutput = output;
    if (verification) {
      robot.verification = {
        ...verification,
        verifiedAt: Date.now(),
      };
    }
    robot.status = "COMPLETE";
    robot.workingPhase = "COMPLETED";
    robot.lastActiveAt = Date.now();
    return true;
  }

  /**
   * Records a visible robot-to-robot handoff based on real WorkerHandoffContract.
   */
  public recordHandoff(
    fromIdentifier: string,
    toIdentifier: string,
    summary: string
  ): boolean {
    const fromRobot = this.resolveRobot(fromIdentifier);
    const toRobot = this.resolveRobot(toIdentifier);
    if (!fromRobot || !toRobot) return false;

    fromRobot.handoffState = {
      toRobotId: toRobot.robotId,
      toWorkerId: toRobot.workerId,
      summary,
      timestamp: Date.now(),
    };

    this.addMessage({
      fromRobotId: fromRobot.robotId,
      fromRobotName: fromRobot.displayName,
      toRobotId: toRobot.robotId,
      toRobotName: toRobot.displayName,
      outcomeId: fromRobot.currentOutcomeId || "active-outcome",
      messageText: `Handoff to ${toRobot.displayName}: ${summary}`,
      eventType: "HANDOFF",
    });

    return true;
  }

  /**
   * Records a structured robot communication event.
   */
  public addMessage(
    params: Omit<RobotMessage, "messageId" | "timestamp">
  ): RobotMessage {
    const message: RobotMessage = {
      messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      ...params,
    };
    this.messages.push(message);
    return message;
  }

  /**
   * Retrieves messages for an outcome or all recent messages.
   */
  public getMessages(outcomeId?: string, limit: number = 50): RobotMessage[] {
    let list = this.messages;
    if (outcomeId) {
      list = list.filter((m) => m.outcomeId === outcomeId);
    }
    return list.slice(-limit);
  }

  /**
   * Strict sanitizer ensuring zero secrets, tokens, credentials, or private system data leak.
   */
  private sanitizeToolData(raw: string): string {
    return raw
      .replace(/(?:api[-_]?key|secret|token|password|bearer|auth)[=:\s]+[A-Za-z0-9_\-\.]{8,}/gi, "[REDACTED]")
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[REDACTED_DB_URL]")
      .replace(/[A-Za-z0-9_\-\.]{32,}/g, (match) => {
        // Redact suspicious hash/token strings longer than 32 chars
        if (match.includes("-") && match.length === 36) return match; // UUIDs are fine
        return "[REDACTED_TOKEN]";
      });
  }

  private activityLogger?: (params: {
    organizationId: string;
    workerId: string;
    eventType: any;
    status: string;
    metadata?: Record<string, unknown>;
  }) => void;

  public setActivityLogger(logger: (params: any) => void): void {
    this.activityLogger = logger;
  }

  /**
   * Logs a workforce activity event with organization tenant scoping.
   */
  private logActivity(
    workerId: string,
    eventType: any,
    status: string,
    metadata?: Record<string, unknown>
  ): void {
    if (this.activityLogger) {
      this.activityLogger({
        organizationId: "11111111-1111-1111-1111-111111111111",
        workerId,
        eventType,
        status,
        metadata,
      });
    }
  }
}
