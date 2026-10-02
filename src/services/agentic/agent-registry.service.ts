/**
 * ELMO Phase 4 — Governed Workforce & Agent Registry Service (AgentRegistryService)
 *
 * Central directory, lifecycle manager, and capability directory for all specialized
 * AI workers and legacy agent contracts operating under ELMO Central Brain governance.
 *
 * ARCHITECTURAL PRINCIPLE:
 * Extends existing Agent Registry into a Governed Workforce Registry.
 * Preserves 100% backward compatibility for Phase 3/3.1/3.2 while introducing:
 * 1. 7 Foundational Workers (Research, Analytics, Marketing, Copy, Sales, Web/Coding, Operations).
 * 2. Full Worker Lifecycle (Create, Read, Update, Enable, Disable, Version, Archive).
 * 3. Operational Performance & Workload Metrics (tasks assigned, completed, failed, retried, handoffs).
 * 4. Dual-lookup aliases (e.g., 'research-worker' <-> 'research-agent').
 * 5. Strict Governance: Disabled or Maintenance workers can NEVER be selected for execution.
 */

import {
  AgentDefinition,
  AgentRole,
  WorkerDefinition,
  WorkerStatus,
  WorkerPerformanceMetrics,
} from "./types/agentic.types";

export function createDefaultWorkerMetrics(): WorkerPerformanceMetrics {
  return {
    tasksAssigned: 0,
    tasksCompleted: 0,
    tasksFailed: 0,
    verificationFailures: 0,
    averageExecutionTimeMs: 0,
    retryCount: 0,
    replanCount: 0,
    approvalRequests: 0,
    humanCorrections: 0,
    handoffs: 0,
    blockedTasks: 0,
  };
}

export class AgentRegistryService {
  private static instance: AgentRegistryService;
  private agents: Map<string, WorkerDefinition> = new Map();
  private aliases: Map<string, string> = new Map();

  private constructor() {
    this.registerDefaultWorkers();
  }

  public static getInstance(): AgentRegistryService {
    if (!AgentRegistryService.instance) {
      AgentRegistryService.instance = new AgentRegistryService();
    }
    return AgentRegistryService.instance;
  }

  public static resetInstance(): void {
    AgentRegistryService.instance = undefined as any;
  }

  /**
   * Resets registry to initial state (useful for test isolation).
   */
  public reset(): void {
    this.agents.clear();
    this.aliases.clear();
    this.registerDefaultWorkers();
  }

  /**
   * Resolves an ID through alias mapping if present.
   */
  public resolveWorkerAlias(id: string): string {
    return this.resolveId(id);
  }

  private resolveId(id: string): string {
    if (this.agents.has(id)) return id;
    const direct = this.aliases.get(id);
    if (direct && this.agents.has(direct)) return direct;
    return id;
  }

  // ==========================================================================
  // 1. Agent Registry Legacy Interface (100% Backward Compatible)
  // ==========================================================================

  /**
   * Registers a new specialized agent/worker into the registry.
   */
  public registerAgent(agent: AgentDefinition): void {
    if (!agent.id || !agent.name) {
      throw new Error("Agent definition must contain a valid id and name.");
    }
    const worker: WorkerDefinition = {
      ...agent,
      status: agent.status || (agent.enabled ? "AVAILABLE" : "DISABLED"),
      availability: agent.availability !== undefined ? agent.availability : (agent.enabled ? 1.0 : 0.0),
      workload: agent.workload || 0,
      capacity: agent.capacity || 5,
      workerType: agent.workerType || "specialist",
      source: agent.source || "builtin",
      createdAt: agent.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      performanceMetrics: agent.performanceMetrics || createDefaultWorkerMetrics(),
    };
    this.agents.set(agent.id, worker);
  }

  /**
   * Unregisters an agent from the registry.
   */
  public unregisterAgent(agentId: string): boolean {
    const canonical = this.resolveId(agentId);
    return this.agents.delete(canonical) || this.agents.delete(agentId);
  }

  /**
   * Retrieves an agent by its unique identifier or alias.
   */
  public getAgent(agentId: string): WorkerDefinition | undefined {
    const canonical = this.resolveId(agentId);
    return this.agents.get(canonical) || this.agents.get(agentId);
  }

  /**
   * Lists all registered agents, optionally filtered by role or enabled status.
   */
  public listAgents(filters?: { role?: AgentRole; enabledOnly?: boolean }): WorkerDefinition[] {
    let list = Array.from(this.agents.values());

    if (filters?.role) {
      list = list.filter((a) => a.role === filters.role);
    }

    if (filters?.enabledOnly) {
      list = list.filter((a) => a.enabled && a.status !== "DISABLED" && a.status !== "MAINTENANCE");
    }

    // Deduplicate in case canonical IDs and aliases are both registered in map
    const seen = new Set<string>();
    const deduplicated: WorkerDefinition[] = [];
    for (const item of list) {
      const canonical = this.resolveId(item.id);
      if (!seen.has(canonical)) {
        seen.add(canonical);
        deduplicated.push(item);
      }
    }

    // Sort by priority descending
    return deduplicated.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Enables or disables an agent dynamically.
   */
  public setAgentEnabled(agentId: string, enabled: boolean): boolean {
    const canonical = this.resolveId(agentId);
    const agent = this.agents.get(canonical) || this.agents.get(agentId);
    if (!agent) return false;
    agent.enabled = enabled;
    agent.status = enabled ? "AVAILABLE" : "DISABLED";
    agent.availability = enabled ? 1.0 : 0.0;
    agent.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Checks if an agent has permission to use a specific tool.
   */
  public isToolAllowed(agentId: string, toolName: string): boolean {
    const canonical = this.resolveId(agentId);
    const agent = this.agents.get(canonical) || this.agents.get(agentId);
    if (!agent || !agent.enabled || agent.status === "DISABLED") return false;
    return agent.allowedTools.includes(toolName) || agent.allowedTools.includes("*");
  }

  /**
   * Finds all enabled agents possessing a specific skill capability.
   */
  public getAgentsBySkill(skillName: string): WorkerDefinition[] {
    const target = skillName.toLowerCase();
    return this.listAgents({ enabledOnly: true }).filter((agent) =>
      agent.skills?.some((s) => s.toLowerCase() === target)
    );
  }

  /**
   * Finds workers matching required capabilities semantically via registry metadata.
   */
  public findWorkersForCapabilities(capabilities: string[], organizationId?: string): WorkerDefinition[] {
    const targets = capabilities.map((c) => c.toLowerCase());
    return this.getWorkers({ organizationId, enabledOnly: true }).filter((worker) => {
      return targets.some((reqCap) => {
        // Direct capabilities check
        if (
          worker.capabilities.some(
            (c) =>
              c.toLowerCase() === reqCap ||
              reqCap.includes(c.toLowerCase()) ||
              c.toLowerCase().includes(reqCap)
          )
        ) {
          return true;
        }
        // Structured capabilities check
        if (
          worker.structuredCapabilities?.some(
            (sc) =>
              sc.capabilityId.toLowerCase() === reqCap ||
              sc.name.toLowerCase().includes(reqCap) ||
              sc.description.toLowerCase().includes(reqCap)
          )
        ) {
          return true;
        }
        return false;
      });
    });
  }

  /**
   * Retrieves optional worker dependencies / capability relationships.
   */
  public getWorkerDependencies(workerId: string): string[] {
    const canonical = this.resolveId(workerId);
    const worker = this.getWorker(canonical);
    const rawDeps = worker?.dependencies || [];
    const set = new Set<string>();
    for (const d of rawDeps) {
      set.add(d);
      const res = this.resolveId(d);
      set.add(res);
      if (d.endsWith("-agent")) set.add(d.replace("-agent", "-worker"));
      if (d.endsWith("-worker")) set.add(d.replace("-worker", "-agent"));
    }
    return Array.from(set);
  }

  // ==========================================================================
  // 2. Governed Workforce Registry Interface (Phase 4)
  // ==========================================================================

  /**
   * Retrieves all governed workers with optional role, status, and enabled filters.
   */
  public getWorkers(filters?: {
    role?: AgentRole;
    status?: WorkerStatus;
    enabledOnly?: boolean;
    organizationId?: string;
  }): WorkerDefinition[] {
    let list = this.listAgents({
      role: filters?.role,
      enabledOnly: filters?.enabledOnly,
    });

    const agentToWorkerId: Record<string, string> = {
      "research-agent": "research-worker",
      "analytics-agent": "analytics-worker",
      "marketing-agent": "marketing-worker",
      "copy-agent": "copy-worker",
      "web-coding-agent": "web-coding-worker",
      "funnel-agent": "marketing-worker",
      "sales-agent": "sales-worker",
      "operations-agent": "operations-worker",
      "strategy-agent": "strategy-worker",
      "automation-agent": "automation-worker",
      "support-agent": "support-worker",
    };

    let workers = list.map((a) => {
      const wId = agentToWorkerId[a.id] || a.id;
      return {
        ...a,
        id: wId,
        name: a.name.replace(/ Agent$/, " Worker"),
      };
    });

    if (filters?.status) {
      workers = workers.filter((w) => w.status === filters.status);
    }

    if (filters?.organizationId) {
      workers = workers.filter((w) => !w.organizationId || w.organizationId === filters.organizationId);
    }

    return workers;
  }

  /**
   * Retrieves a single worker by ID or alias.
   */
  public getWorker(workerId: string): WorkerDefinition | undefined {
    const canonical = this.resolveId(workerId);
    const agent = this.agents.get(canonical) || this.agents.get(workerId);
    if (!agent) return undefined;
    return {
      ...agent,
      id: workerId,
      name: agent.name.replace(/ Agent$/, " Worker"),
    };
  }


  /**
   * Creates and registers a new worker definition into the workforce registry.
   */
  public createWorker(
    worker: Partial<WorkerDefinition> & { id: string; name: string; role: AgentRole }
  ): WorkerDefinition {
    if (!worker.id || !worker.name || !worker.role) {
      throw new Error("Worker definition requires valid id, name, and role.");
    }

    const newWorker: WorkerDefinition = {
      id: worker.id,
      name: worker.name,
      description: worker.description || `${worker.name} workforce specialist.`,
      role: worker.role,
      capabilities: worker.capabilities || [],
      skills: worker.skills || [],
      allowedTools: worker.allowedTools || [],
      permissions: worker.permissions || [],
      systemInstructions: worker.systemInstructions || `You are the ${worker.name}. Execute assigned tasks under ELMO supervision.`,
      enabled: worker.enabled !== undefined ? worker.enabled : true,
      status: worker.status || (worker.enabled === false ? "DISABLED" : "AVAILABLE"),
      availability: worker.availability !== undefined ? worker.availability : 1.0,
      workload: worker.workload || 0,
      capacity: worker.capacity || 5,
      version: worker.version || "1.0.0",
      priority: worker.priority || 80,
      workerType: worker.workerType || "custom",
      source: worker.source || "builtin",
      executionLimits: worker.executionLimits || {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 20000,
        maxRetries: 2,
      },
      organizationId: worker.organizationId,
      createdAt: worker.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      performanceMetrics: worker.performanceMetrics || createDefaultWorkerMetrics(),
    };

    this.agents.set(newWorker.id, newWorker);
    return newWorker;
  }

  /**
   * Updates an existing worker with partial updates.
   */
  public updateWorker(workerId: string, updates: Partial<WorkerDefinition>): boolean {
    const canonical = this.resolveId(workerId);
    const worker = this.agents.get(canonical) || this.agents.get(workerId);
    if (!worker) return false;

    Object.assign(worker, updates, { updatedAt: new Date().toISOString() });
    return true;
  }

  /**
   * Enables a worker.
   */
  public enableWorker(workerId: string): boolean {
    return this.setAgentEnabled(workerId, true);
  }

  /**
   * Disables a worker. A disabled worker must NEVER be selected for execution.
   */
  public disableWorker(workerId: string): boolean {
    return this.setAgentEnabled(workerId, false);
  }

  /**
   * Archives a worker by marking maintenance mode and disabling it.
   */
  public archiveWorker(workerId: string): boolean {
    const canonical = this.resolveId(workerId);
    this.aliases.delete(workerId);
    return this.agents.delete(canonical) || this.agents.delete(workerId);
  }

  /**
   * Sets the operational status of a worker.
   */
  public setWorkerStatus(workerId: string, status: WorkerStatus): boolean {
    const canonical = this.resolveId(workerId);
    const worker = this.agents.get(canonical) || this.agents.get(workerId);
    if (!worker) return false;

    worker.status = status;
    if (status === "DISABLED" || status === "MAINTENANCE") {
      worker.enabled = false;
      worker.availability = 0.0;
    } else if (status === "AVAILABLE") {
      worker.enabled = true;
      worker.availability = Math.max(0, 1 - worker.workload / worker.capacity);
    } else if (status === "BUSY") {
      worker.availability = 0.0;
    }
    worker.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Adjusts the current active workload count of a worker.
   */
  public updateWorkerWorkload(workerId: string, delta: number): void {
    const canonical = this.resolveId(workerId);
    const worker = this.agents.get(canonical) || this.agents.get(workerId);
    if (!worker) return;

    worker.workload = Math.max(0, worker.workload + delta);
    if (worker.workload >= worker.capacity) {
      worker.status = "BUSY";
      worker.availability = 0.0;
    } else if (worker.status === "BUSY" && worker.workload < worker.capacity) {
      worker.status = "AVAILABLE";
      worker.availability = Math.max(0, 1 - worker.workload / worker.capacity);
    } else {
      worker.availability = Math.max(0, 1 - worker.workload / worker.capacity);
    }
    worker.updatedAt = new Date().toISOString();
  }

  /**
   * Records operational metrics for a worker.
   */
  public recordWorkerMetrics(workerId: string, metricsDelta: Partial<WorkerPerformanceMetrics>): void {
    const canonical = this.resolveId(workerId);
    const worker = this.agents.get(canonical) || this.agents.get(workerId);
    if (!worker) return;

    const m = worker.performanceMetrics;
    if (metricsDelta.tasksAssigned !== undefined) m.tasksAssigned += metricsDelta.tasksAssigned;
    if (metricsDelta.tasksCompleted !== undefined) m.tasksCompleted += metricsDelta.tasksCompleted;
    if (metricsDelta.tasksFailed !== undefined) m.tasksFailed += metricsDelta.tasksFailed;
    if (metricsDelta.verificationFailures !== undefined) m.verificationFailures += metricsDelta.verificationFailures;
    if (metricsDelta.retryCount !== undefined) m.retryCount += metricsDelta.retryCount;
    if (metricsDelta.replanCount !== undefined) m.replanCount += metricsDelta.replanCount;
    if (metricsDelta.approvalRequests !== undefined) m.approvalRequests += metricsDelta.approvalRequests;
    if (metricsDelta.humanCorrections !== undefined) m.humanCorrections += metricsDelta.humanCorrections;
    if (metricsDelta.handoffs !== undefined) m.handoffs += metricsDelta.handoffs;
    if (metricsDelta.blockedTasks !== undefined) m.blockedTasks += metricsDelta.blockedTasks;
    if (metricsDelta.averageExecutionTimeMs !== undefined) {
      m.averageExecutionTimeMs = Math.round(
        (m.averageExecutionTimeMs + metricsDelta.averageExecutionTimeMs) / 2
      );
    }
    worker.lastActiveAt = new Date().toISOString();
    worker.updatedAt = new Date().toISOString();
  }

  /**
   * Checks if a worker is available for new assignments.
   */
  public isWorkerAvailable(workerId: string): boolean {
    const canonical = this.resolveId(workerId);
    const worker = this.agents.get(canonical) || this.agents.get(workerId);
    if (!worker) return false;
    return worker.enabled && worker.status === "AVAILABLE" && worker.workload < worker.capacity;
  }

  // ==========================================================================
  // 3. Foundational Workforce Initialization (Phase 4 — 7 Foundational Workers)
  // ==========================================================================

  private registerDefaultWorkers(): void {
    const now = new Date().toISOString();

    // 1. Research Agent (worker alias: research-worker)
    const researchAgent: WorkerDefinition = {
      id: "research-agent",
      name: "Research Agent",
      description: "Gathers information, retrieves knowledge, compares intelligence, sources evidence, and identifies business unknowns.",
      role: "RESEARCH",
      robotName: "NOVA",
      capabilities: [
        "research",
        "gather_information",
        "retrieve_knowledge",
        "compare_information",
        "summarize",
        "source_evidence",
        "identify_unknowns",
        "audience_profiling",
        "competitor_analysis",
        "market_trend_extraction",
        "pain_point_mapping",
      ],
      skills: ["Research", "Analyze", "Compare", "Audit", "Summarize", "Report"],
      allowedTools: ["search_knowledge", "query_memory", "analyze_audience"],
      permissions: ["read:memory", "read:knowledge", "read:market"],
      systemInstructions:
        "You are the ELMO Research Worker. Extract actionable target audience pains, desires, competitor benchmarks, and retrieve ground truth from Company Brain and knowledge assets.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 5,
      version: "1.0.0",
      priority: 80,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      dependencies: [],
      structuredCapabilities: [
        {
          capabilityId: "market_research",
          name: "Market Research & Intelligence",
          description: "Audience profiling, competitor analysis, and market trend extraction",
          skills: ["Research", "Analyze", "Compare"],
          tools: ["search_knowledge", "query_memory", "analyze_audience"],
          permissions: ["read:memory", "read:knowledge", "read:market"],
          verificationRequirements: ["tenant_isolated", "grounded_facts"],
        },
      ],
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    };
    this.agents.set(researchAgent.id, researchAgent);
    this.aliases.set("research-worker", "research-agent");

    // 2. Analytics Agent (worker alias: analytics-worker)
    const analyticsAgent: WorkerDefinition = {
      id: "analytics-agent",
      name: "Analytics Agent",
      description: "Analyzes quantitative business data, identifies patterns, calculates KPIs, compares performance, detects anomalies, and generates diagnostic reports.",
      role: "ANALYTICS",
      robotName: "ATLAS",
      capabilities: [
        "analyze_data",
        "identify_patterns",
        "calculate_metrics",
        "compare_performance",
        "identify_anomalies",
        "generate_reports",
        "forecasting",
        "conversion_audit",
        "drop_off_detection",
        "metric_interpretation",
        "ab_test_recommendations",
        "business_intelligence_audit",
      ],
      skills: ["Analyze", "Audit", "Compare", "Forecast", "Monitor", "Report", "Verify"],
      allowedTools: [
        "get_funnel_analytics",
        "get_dashboard_analytics",
        "get_analytics_summary",
        "query_memory",
      ],
      permissions: ["read:analytics", "read:memory"],
      systemInstructions:
        "You are the ELMO Analytics Worker. Translate raw business telemetry, funnel metrics, and operational performance numbers into high-leverage diagnostic reports.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 5,
      version: "1.0.0",
      priority: 75,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    };
    this.agents.set(analyticsAgent.id, analyticsAgent);
    this.aliases.set("analytics-worker", "analytics-agent");

    // 3. Marketing Agent (worker alias: marketing-worker)
    const marketingAgent: WorkerDefinition = {
      id: "marketing-agent",
      name: "Marketing Agent",
      description: "Formulates marketing positioning, unique value propositions, campaign architectures, audience targeting, and offer designs.",
      role: "MARKETING",
      robotName: "GROW",
      capabilities: [
        "marketing_analysis",
        "campaign_planning",
        "audience_analysis",
        "positioning",
        "marketing_strategy",
        "optimization",
        "value_proposition",
        "offer_design",
      ],
      skills: ["Research", "Plan", "Write", "Analyze", "Create", "Optimize", "Recommend"],
      allowedTools: ["query_memory", "store_memory", "create_offer_blueprint"],
      permissions: ["read:memory", "write:memory", "read:marketing"],
      systemInstructions:
        "You are the ELMO Marketing Worker. Define razor-sharp positioning, irresistible offers, and campaign architectures based on verified company context.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 5,
      version: "1.0.0",
      priority: 85,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    };
    this.agents.set(marketingAgent.id, marketingAgent);
    this.aliases.set("marketing-worker", "marketing-agent");

    // 4. Copy Agent (worker alias: copy-worker)
    const copyAgent: WorkerDefinition = {
      id: "copy-agent",
      name: "Copy Agent",
      description: "Writes conversion-focused headlines, landing page copy, messaging, offers, emails, objection counters, and persuasive content.",
      role: "COPY",
      robotName: "COPY",
      capabilities: [
        "copywriting",
        "messaging",
        "content",
        "headlines",
        "offers",
        "emails",
        "landing_page_copy",
        "social_content",
        "cta_optimization",
        "objection_handling",
        "microcopy",
      ],
      skills: ["Write", "Summarize", "Communicate", "Optimize"],
      allowedTools: ["query_memory", "generate_copy_variants"],
      permissions: ["read:memory", "generate:copy"],
      systemInstructions:
        "You are the ELMO Copy Worker. Craft high-impact, emotionally resonant copy that hooks attention and drives customer conversions.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 5,
      version: "1.0.0",
      priority: 90,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    };
    this.agents.set(copyAgent.id, copyAgent);
    this.aliases.set("copy-worker", "copy-agent");

    // 5. Funnel / Sales Agent (worker alias: sales-worker / funnel-worker)
    const funnelAgent: WorkerDefinition = {
      id: "funnel-agent",
      name: "Funnel Agent",
      description: "Specializes in lead qualification, conversion analysis, sales process analysis, follow-up planning, objection resolution, and conversion optimization.",
      role: "FUNNEL",
      robotName: "SALES",
      capabilities: [
        "lead_qualification",
        "conversion_analysis",
        "sales_process_analysis",
        "follow_up_planning",
        "objection_analysis",
        "conversion_optimization",
        "funnel_architecture",
        "step_sequencing",
        "lead_capture_flow",
        "form_connection",
      ],
      skills: ["Plan", "Design", "Build", "Qualify", "Create", "Optimize", "Follow Up"],
      allowedTools: [
        "create_funnel",
        "update_funnel",
        "get_funnel",
        "list_funnels",
        "create_page",
        "create_form",
        "query_memory",
        "store_memory",
        "analyze_sales_funnel",
        "qualify_lead",
      ],
      permissions: ["read:funnel", "write:funnel", "read:memory", "write:memory", "read:sales"],
      systemInstructions:
        "You are the ELMO Sales / Conversion Worker. Optimize end-to-end buyer journeys, lead qualification pipelines, and high-converting conversion funnels.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 5,
      version: "1.0.0",
      priority: 95,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      executionLimits: {
        maxHops: 4,
        maxToolCallsPerTurn: 6,
        timeoutMs: 20000,
        maxRetries: 2,
      },
    };
    this.agents.set(funnelAgent.id, funnelAgent);
    this.aliases.set("funnel-worker", "funnel-agent");

    // 6. Web / Coding Agent (worker alias: web-coding-worker)
    const webCodingAgent: WorkerDefinition = {
      id: "web-coding-agent",
      name: "Web/Coding Agent",
      description: "Builds, designs, codes, modifies, tests, debugs, and verifies web applications, dashboards, landing pages, and responsive components with live preview and validation.",
      role: "WEB_CODING",
      robotName: "CODEX",
      capabilities: [
        "design",
        "build",
        "code",
        "modify",
        "test",
        "debug",
        "preview",
        "visual_qa",
        "verify",
        "landing_page_generation",
        "website_generation",
        "section_creation",
        "component_styling",
        "responsive_design",
        "code_modification",
        "code_validation",
        "build_verification",
        "preview_generation",
        "version_rollback",
      ],
      skills: ["Design", "Build", "Code", "Test", "Debug", "Verify", "Create"],
      allowedTools: [
        "PROJECT_READ",
        "PROJECT_SEARCH",
        "FILE_READ",
        "FILE_CREATE",
        "FILE_UPDATE",
        "DIRECTORY_LIST",
        "CODE_GENERATE",
        "CODE_MODIFY",
        "VALIDATE_CODE",
        "BUILD_PROJECT",
        "PREVIEW_PROJECT",
        "CREATE_PAGE",
        "UPDATE_PAGE",
        "CREATE_SECTION",
        "UPDATE_SECTION",
      ],
      permissions: [
        "read:project",
        "write:project",
        "read:page",
        "write:page",
        "build:preview",
      ],
      systemInstructions:
        "You are the ELMO Web & Coding Worker. Create premium, mobile-optimized landing pages and websites with structured sections and robust validation.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 5,
      version: "1.0.0",
      priority: 95,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      executionLimits: {
        maxHops: 5,
        maxToolCallsPerTurn: 8,
        timeoutMs: 30000,
        maxRetries: 3,
      },
    };
    this.agents.set(webCodingAgent.id, webCodingAgent);
    this.aliases.set("web-coding-worker", "web-coding-agent");

    // 7. Sales Worker (Phase 4 Foundational Worker)
    const salesWorker: WorkerDefinition = {
      id: "sales-worker",
      name: "Sales Worker",
      description: "Specializes in lead qualification, sales funnel architecture, conversion audits, and buyer journey pipeline engineering.",
      role: "SALES",
      robotName: "SALES",
      capabilities: [
        "lead_qualification",
        "conversion_analysis",
        "sales_process_analysis",
        "follow_up_planning",
        "objection_analysis",
        "conversion_optimization",
      ],
      skills: ["Plan", "Qualify", "Create", "Optimize", "Follow Up"],
      allowedTools: [
        "create_funnel",
        "query_memory",
        "store_memory",
        "analyze_sales_funnel",
        "qualify_lead",
      ],
      permissions: ["read:funnel", "write:funnel", "read:memory", "write:memory", "read:sales"],
      systemInstructions:
        "You are the ELMO Sales Worker. Qualify inbound opportunities and optimize buyer conversion funnels.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 5,
      version: "1.0.0",
      priority: 75,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    };
    this.agents.set(salesWorker.id, salesWorker);
    this.aliases.set("sales-agent", "sales-worker");

    // 8. Operations Worker (Phase 4 Foundational Worker)
    const operationsWorker: WorkerDefinition = {
      id: "operations-worker",
      name: "Operations Worker",
      description: "Analyzes operational workflows, coordinates tasks, evaluates SOPs, models process improvements, and produces operational audit reports.",
      role: "OPERATIONS",
      robotName: "OPS",
      capabilities: [
        "operational_analysis",
        "process_analysis",
        "workflow_planning",
        "process_optimization",
        "task_coordination",
        "sop_analysis",
        "operational_reporting",
      ],
      skills: [
        "Analyze",
        "Audit",
        "Plan",
        "Monitor",
        "Report",
        "Verify",
        "Recommend",
        "Workflow Planning",
        "SOP Analysis",
      ],
      allowedTools: [
        "query_memory",
        "generate_sop_summary",
        "audit_operations_workflow",
        "get_dashboard_analytics",
      ],
      permissions: ["read:operations", "read:memory", "read:sop"],
      systemInstructions:
        "You are the ELMO Operations Worker. Analyze operating workflows, bottlenecks, SOP conformance, and optimize task coordination for sustainable execution.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 5,
      version: "1.0.0",
      priority: 70,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    };
    this.agents.set(operationsWorker.id, operationsWorker);
    this.aliases.set("operations-agent", "operations-worker");

    // 9. Strategy Worker (Phase 4 Workforce Expansion)
    const strategyWorker: WorkerDefinition = {
      id: "strategy-worker",
      name: "Strategy Worker",
      description:
        "Transforms verified business context, Company Brain data, and high-level objectives into prioritized strategic options, action roadmaps, and worker delegation plans.",
      role: "STRATEGY",
      robotName: "STRATEGY",
      capabilities: [
        "strategic_planning",
        "business_problem_analysis",
        "goal_analysis",
        "opportunity_identification",
        "strategic_option_generation",
        "option_generation",
        "tradeoff_analysis",
        "priority_identification",
        "action_plan_creation",
        "dependency_identification",
        "dependency_mapping",
        "risk_identification",
        "risk_assessment",
        "resource_consideration",
        "worker_delegation_recommendations",
        "strategic_review",
        "outcome_planning",
        "decision_framing",
      ],
      skills: [
        "Business Analysis",
        "Strategic Planning",
        "Goal Decomposition",
        "Opportunity Analysis",
        "Risk Analysis",
        "Action Planning",
        "Plan",
        "Analyze",
        "Recommend",
      ],
      allowedTools: [
        "query_company_brain",
        "query_memory",
        "search_knowledge",
        "get_dashboard_analytics",
        "get_analytics_summary",
        "store_memory",
        "query_market_data",
        "read_resource",
        "create_handoff_contract",
      ],
      permissions: [
        "read:memory",
        "read:knowledge",
        "read:analytics",
        "write:strategy",
        "write:memory",
      ],
      systemInstructions:
        "You are the ELMO Strategy Worker. Transform verified business context, metrics, and goals into rigorous, structured, and verifiable strategic options and actionable plans. Do not independently override human authority or policies.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 4,
      version: "1.0.0",
      priority: 90,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      dependencies: ["research-agent", "analytics-agent"],
      structuredCapabilities: [
        {
          capabilityId: "strategic_planning",
          name: "Strategic Planning & Decomposition",
          description: "Transforms verified context into prioritized options, trade-offs, and delegation plans",
          skills: ["Strategic Planning", "Business Analysis", "Goal Decomposition", "Opportunity Analysis", "Risk Analysis"],
          tools: ["query_company_brain", "query_memory", "search_knowledge", "get_analytics_summary"],
          permissions: ["read:memory", "read:knowledge", "read:analytics", "write:strategy"],
          verificationRequirements: [
            "strategic_options_generated",
            "risks_and_dependencies_identified",
            "actionable_recommendations_present",
          ],
          dependencies: ["research-agent", "analytics-agent"],
        },
      ],
      executionLimits: {
        maxHops: 4,
        maxToolCallsPerTurn: 6,
        timeoutMs: 20000,
        maxRetries: 2,
      },
      verificationRules: [
        "strategic_options_generated",
        "risks_and_dependencies_identified",
        "actionable_recommendations_present",
        "tenant_isolated",
      ],
      approvalRequirements: ["high_impact_strategic_pivot"],
    };
    this.agents.set(strategyWorker.id, strategyWorker);
    this.aliases.set("strategy-agent", "strategy-worker");

    // 10. Automation Worker (Phase 4 Workforce Expansion)
    const automationWorker: WorkerDefinition = {
      id: "automation-worker",
      name: "Automation Worker",
      description:
        "Designs, configures, tests, and verifies approved event-driven business automation workflows (Trigger -> Conditions -> Actions -> Verification -> Result) using controlled tools.",
      role: "AUTOMATION",
      robotName: "AUTOMATION",
      capabilities: [
        "workflow_automation",
        "workflow_discovery",
        "process_mapping",
        "trigger_identification",
        "condition_mapping",
        "action_mapping",
        "automation_design",
        "workflow_configuration",
        "workflow_testing",
        "failure_detection",
        "automation_verification",
        "workflow_optimization",
        "automation_documentation",
      ],
      skills: [
        "Workflow Design",
        "Trigger Mapping",
        "Condition Mapping",
        "Action Mapping",
        "Workflow Testing",
        "Automation Verification",
        "Workflow Planning",
        "Plan",
        "Verify",
      ],
      allowedTools: [
        "create_automation",
        "activate_automation",
        "query_company_brain",
        "query_memory",
        "store_memory",
        "manage_task",
        "trigger_event",
        "audit_operations_workflow",
      ],
      permissions: [
        "read:automation",
        "write:automation",
        "execute:automation",
        "read:operations",
      ],
      systemInstructions:
        "You are the ELMO Automation Worker. Design and test event-driven business automation workflows using only controlled tools from the Tool Registry. Never execute arbitrary code or bypass approval requirements.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 3,
      version: "1.0.0",
      priority: 85,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      dependencies: ["strategy-agent", "operations-agent"],
      structuredCapabilities: [
        {
          capabilityId: "workflow_automation",
          name: "Event-Driven Workflow Automation",
          description: "Configures, tests, and verifies Trigger -> Conditions -> Actions business workflows",
          skills: ["Workflow Design", "Trigger Mapping", "Condition Mapping", "Action Mapping", "Workflow Testing"],
          tools: ["create_automation", "activate_automation", "manage_task"],
          permissions: ["read:automation", "write:automation", "execute:automation"],
          verificationRequirements: [
            "valid_workflow_structure",
            "no_arbitrary_code",
            "high_impact_approval_flagged",
          ],
          dependencies: ["strategy-agent", "operations-agent"],
        },
      ],
      executionLimits: {
        maxHops: 4,
        maxToolCallsPerTurn: 6,
        timeoutMs: 20000,
        maxRetries: 2,
      },
      verificationRules: [
        "valid_workflow_structure",
        "no_arbitrary_code",
        "high_impact_approval_flagged",
        "tenant_isolated",
      ],
      approvalRequirements: ["activate_automation", "external_dispatch"],
    };
    this.agents.set(automationWorker.id, automationWorker);
    this.aliases.set("automation-agent", "automation-worker");

    // 11. Support Worker (Phase 4 Workforce Expansion)
    const supportWorker: WorkerDefinition = {
      id: "support-worker",
      name: "Support Worker",
      description:
        "Resolves customer enquiries, retrieves verified policies and FAQs from Company Brain, categorizes issues, and executes governed support workflows without hallucinating customer facts.",
      role: "SUPPORT",
      robotName: "SUPPORT",
      capabilities: [
        "customer_support",
        "customer_enquiry_resolution",
        "customer_enquiry_classification",
        "faq_handling",
        "policy_retrieval",
        "customer_information_retrieval",
        "support_response_drafting",
        "issue_categorization",
        "priority_detection",
        "escalation_detection",
        "support_workflow_execution",
        "case_summarization",
        "resolution_verification",
        "human_escalation",
      ],
      skills: [
        "Customer Enquiry Handling",
        "Knowledge Retrieval",
        "Response Drafting",
        "Issue Classification",
        "Escalation",
        "Resolution Verification",
        "Communicate",
        "Summarize",
      ],
      allowedTools: [
        "query_company_brain",
        "search_knowledge",
        "query_memory",
        "get_contact",
        "add_contact_tag",
        "create_contact",
        "create_handoff_contract",
      ],
      permissions: [
        "read:knowledge",
        "read:memory",
        "read:contact",
        "write:contact",
        "read:support",
      ],
      systemInstructions:
        "You are the ELMO Support Worker. Resolve customer enquiries using strictly approved Company Brain and verified customer records. Never invent customer, order, policy, refund, or payment details. Request missing information or escalate if unauthorized.",
      enabled: true,
      status: "AVAILABLE",
      availability: 1.0,
      workload: 0,
      capacity: 4,
      version: "1.0.0",
      priority: 80,
      workerType: "foundational",
      source: "builtin",
      createdAt: now,
      updatedAt: now,
      performanceMetrics: createDefaultWorkerMetrics(),
      dependencies: ["operations-agent"],
      structuredCapabilities: [
        {
          capabilityId: "customer_support",
          name: "Grounded Customer Support Resolution",
          description: "Resolves customer enquiries using grounded Company Brain policies without hallucinating",
          skills: ["Customer Enquiry Handling", "Knowledge Retrieval", "Response Drafting", "Issue Classification"],
          tools: ["query_company_brain", "search_knowledge", "query_memory", "get_contact"],
          permissions: ["read:knowledge", "read:memory", "read:contact", "read:support"],
          verificationRequirements: [
            "grounded_information_only",
            "missing_information_handled",
            "sensitive_action_approval_flagged",
          ],
          dependencies: ["operations-agent"],
        },
      ],
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
      verificationRules: [
        "grounded_information_only",
        "missing_information_handled",
        "sensitive_action_approval_flagged",
        "tenant_isolated",
      ],
      approvalRequirements: [
        "refund_issuance",
        "policy_override",
        "account_cancellation",
      ],
    };
    this.agents.set(supportWorker.id, supportWorker);
    this.aliases.set("support-agent", "support-worker");
  }
}

