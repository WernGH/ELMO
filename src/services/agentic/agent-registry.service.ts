/**
 * ELMO Phase 3 — Agent Registry Service (AgentRegistryService)
 *
 * Central directory and metadata manager for all specialized worker agents underneath ELMO.
 * Provides extensible registration, lifecycle management, capability querying, and permission checks.
 */

import { AgentDefinition, AgentRole } from "./types/agentic.types";

export class AgentRegistryService {
  private static instance: AgentRegistryService;
  private agents: Map<string, AgentDefinition> = new Map();

  private constructor() {
    this.registerDefaultAgents();
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
    this.registerDefaultAgents();
  }

  /**
   * Registers a new specialized agent into the registry.
   */
  public registerAgent(agent: AgentDefinition): void {
    if (!agent.id || !agent.name) {
      throw new Error("Agent definition must contain a valid id and name.");
    }
    this.agents.set(agent.id, { ...agent });
  }

  /**
   * Unregisters an agent from the registry.
   */
  public unregisterAgent(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  /**
   * Retrieves an agent by its unique identifier.
   */
  public getAgent(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Lists all registered agents, optionally filtered by role or enabled status.
   */
  public listAgents(filters?: { role?: AgentRole; enabledOnly?: boolean }): AgentDefinition[] {
    let list = Array.from(this.agents.values());

    if (filters?.role) {
      list = list.filter((a) => a.role === filters.role);
    }

    if (filters?.enabledOnly) {
      list = list.filter((a) => a.enabled);
    }

    // Sort by priority descending
    return list.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Enables or disables an agent dynamically.
   */
  public setAgentEnabled(agentId: string, enabled: boolean): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.enabled = enabled;
    return true;
  }

  /**
   * Checks if an agent has permission to use a specific tool.
   */
  public isToolAllowed(agentId: string, toolName: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || !agent.enabled) return false;
    return agent.allowedTools.includes(toolName) || agent.allowedTools.includes("*");
  }

  /**
   * Initializes the 6 canonical Phase 3 foundational agents.
   */
  private registerDefaultAgents(): void {
    // 1. Research Agent
    this.registerAgent({
      id: "research-agent",
      name: "Research Agent",
      description: "Conducts market, competitor, and target audience research to extract positioning insights.",
      role: "RESEARCH",
      capabilities: [
        "audience_profiling",
        "competitor_analysis",
        "market_trend_extraction",
        "pain_point_mapping",
      ],
      allowedTools: ["search_knowledge", "query_memory", "analyze_audience"],
      permissions: ["read:memory", "read:market"],
      systemInstructions:
        "You are the ELMO Research Specialist. Extract actionable target audience pains, desires, objections, and competitor benchmarks.",
      enabled: true,
      version: "1.0.0",
      priority: 80,
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    });

    // 2. Marketing Agent
    this.registerAgent({
      id: "marketing-agent",
      name: "Marketing Agent",
      description: "Formulates marketing positioning, unique value propositions, campaign angles, and offer architectures.",
      role: "MARKETING",
      capabilities: [
        "positioning_strategy",
        "offer_design",
        "campaign_ideation",
        "angle_testing",
        "value_proposition",
      ],
      allowedTools: ["query_memory", "store_memory", "create_offer_blueprint"],
      permissions: ["read:memory", "write:memory", "read:marketing"],
      systemInstructions:
        "You are the ELMO Marketing Strategist. Define razor-sharp positioning, irresistible offers, and campaign architectures based on company context.",
      enabled: true,
      version: "1.0.0",
      priority: 85,
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    });

    // 3. Copy Agent
    this.registerAgent({
      id: "copy-agent",
      name: "Copy Agent",
      description: "Writes conversion-focused headlines, landing page copy, benefits, testimonials, and persuasive calls-to-action.",
      role: "COPY",
      capabilities: [
        "headline_writing",
        "landing_page_copy",
        "email_copywriting",
        "cta_optimization",
        "objection_handling",
        "microcopy",
      ],
      allowedTools: ["query_memory", "generate_copy_variants"],
      permissions: ["read:memory", "generate:copy"],
      systemInstructions:
        "You are the ELMO Conversion Copy Specialist. Write high-impact, emotionally resonant copy that hooks attention and drives action.",
      enabled: true,
      version: "1.0.0",
      priority: 90,
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    });

    // 4. Funnel Agent
    this.registerAgent({
      id: "funnel-agent",
      name: "Funnel Agent",
      description: "Plans and connects multi-step conversion architectures, stages, opt-in flows, and follow-up paths.",
      role: "FUNNEL",
      capabilities: [
        "funnel_architecture",
        "step_sequencing",
        "lead_capture_flow",
        "conversion_optimization",
        "form_connection",
      ],
      allowedTools: [
        "create_funnel",
        "update_funnel",
        "get_funnel",
        "list_funnels",
        "create_page",
        "create_form",
        "query_memory",
        "store_memory",
      ],
      permissions: ["read:funnel", "write:funnel", "read:memory", "write:memory"],
      systemInstructions:
        "You are the ELMO Funnel Architect. Translate marketing strategies into structured, high-converting funnel stages and conversion paths.",
      enabled: true,
      version: "1.0.0",
      priority: 95,
      executionLimits: {
        maxHops: 4,
        maxToolCallsPerTurn: 6,
        timeoutMs: 20000,
        maxRetries: 2,
      },
    });

    // 5. Web/Coding Agent
    this.registerAgent({
      id: "web-coding-agent",
      name: "Web/Coding Agent",
      description: "Builds, styles, and modifies websites and landing pages with responsive components, code validation, and live previews.",
      role: "WEB_CODING",
      capabilities: [
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
        "You are the ELMO Web & Coding Specialist. Create premium, mobile-optimized landing pages and websites with structured sections and robust validation.",
      enabled: true,
      version: "1.0.0",
      priority: 95,
      executionLimits: {
        maxHops: 5,
        maxToolCallsPerTurn: 8,
        timeoutMs: 30000,
        maxRetries: 3,
      },
    });

    // 6. Analytics Agent
    this.registerAgent({
      id: "analytics-agent",
      name: "Analytics Agent",
      description: "Analyzes funnel and landing page performance metrics, conversion drop-offs, and optimization recommendations.",
      role: "ANALYTICS",
      capabilities: [
        "conversion_audit",
        "drop_off_detection",
        "metric_interpretation",
        "ab_test_recommendations",
      ],
      allowedTools: ["get_funnel_analytics", "get_dashboard_analytics", "query_memory"],
      permissions: ["read:analytics", "read:memory"],
      systemInstructions:
        "You are the ELMO Analytics Specialist. Translate raw visitor and conversion data into high-leverage growth and optimization recommendations.",
      enabled: true,
      version: "1.0.0",
      priority: 75,
      executionLimits: {
        maxHops: 3,
        maxToolCallsPerTurn: 4,
        timeoutMs: 15000,
        maxRetries: 2,
      },
    });
  }
}
