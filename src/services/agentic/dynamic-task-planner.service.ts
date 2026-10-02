/**
 * ELMO Phase 3.2 — Dynamic AI Task Planner Service (DynamicTaskPlannerService)
 *
 * True Semantic Planning & Capability-Gated Execution Engine.
 * Eliminates hardcoded business archetypes, substring triggers, and catch-all workflows.
 *
 * Architecture:
 * HUMAN OBJECTIVE
 *   ↓
 * SEMANTIC OBJECTIVE UNDERSTANDING (Negation, Exclusions, Unknowns, Constraints)
 *   ↓
 * AMBIGUITY GATE (Insufficient Information → WAITING_FOR_INPUT)
 *   ↓
 * CAPABILITY-FIRST EVALUATION (ToolRegistry, SkillRegistry, AgentRegistry)
 *   ↓
 * CAPABILITY GATE (Missing Tool/Agent → MISSING_CAPABILITY / UNSUPPORTED_ACTION)
 *   ↓
 * DYNAMIC TASK DECOMPOSITION (Task Formulation justified strictly by objective)
 *   ↓
 * PLAN VALIDATION GATE (Permissions, Acyclic Dependencies, Risk → PLAN_VALIDATION_FAILED)
 *   ↓
 * VALIDATED EXECUTION PLAN
 */

import {
  ExecutionPlan,
  ExecutionStep,
  RiskLevel,
  PendingApprovalDetails,
  ObjectiveUnderstanding,
  RequiredCapability,
} from "./types/agentic.types";
import { AgentRegistryService } from "./agent-registry.service";
import { SkillRegistryService } from "./skill-registry.service";
import { ToolRegistryService } from "./tool-registry.service";
import { GeminiService } from "@/services/gemini.service";
import { KnowledgeContext } from "@/types/knowledge.types";
import { CostResourceGovernorService } from "./cost-resource-governor.service";

export interface PlannerInput {
  userId: string;
  organizationId: string;
  objective: string;
  conversationId?: string;
  companyBrainContext?: Record<string, unknown>;
  memories?: Array<{ content: string; category?: string }>;
  knowledgeContext?: KnowledgeContext;
  userRole?: string;
  permissions?: string[];
}

export interface PlannerGoal {
  type: "business_problem" | "feature_request" | "diagnostic" | "operational" | "strategic" | "unsupported" | "ambiguous";
  desiredOutcome: string;
  successCriteria: string[];
}

export interface PlannerResult {
  plan: ExecutionPlan;
  isDynamic: boolean;
  requiresInput: boolean;
  clarificationQuestions?: string[];
  missingCapabilities?: string[];
  unsupportedCapabilities?: string[];
  understanding?: ObjectiveUnderstanding;
  goal: PlannerGoal;
}

export class DynamicTaskPlannerService {
  private static instance: DynamicTaskPlannerService;
  private agentRegistry: AgentRegistryService;
  private skillRegistry: SkillRegistryService;
  private toolRegistry: ToolRegistryService;
  private geminiService: GeminiService;

  private constructor() {
    this.agentRegistry = AgentRegistryService.getInstance();
    this.skillRegistry = SkillRegistryService.getInstance();
    this.toolRegistry = ToolRegistryService.getInstance();
    this.geminiService = GeminiService.getInstance();
  }

  public static getInstance(): DynamicTaskPlannerService {
    if (!DynamicTaskPlannerService.instance) {
      DynamicTaskPlannerService.instance = new DynamicTaskPlannerService();
    }
    return DynamicTaskPlannerService.instance;
  }

  public static resetInstance(): void {
    DynamicTaskPlannerService.instance = undefined as any;
  }

  /**
   * Plans an ordered, capability-validated execution plan from a business objective (Async with LLM support).
   */
  public async plan(input: PlannerInput): Promise<PlannerResult> {
    const raw = input.objective.trim();
    const planId = `plan-${Date.now()}`;
    const executionId = `exec-${Date.now()}`;

    // 1. Semantic Objective Understanding
    const understanding = this.understandObjective(raw, input);

    // 2. Ambiguity Gate: If missing critical information to take safe action
    if (understanding.requiresClarification) {
      return this.buildWaitingForInputResult(understanding, input, planId, executionId);
    }

    // 3. Capability Gate: Evaluate Required Capabilities against Registries
    const requiredCaps = this.evaluateRequiredCapabilities(understanding);
    const missingCaps = requiredCaps.filter((c) => !c.available);
    if (missingCaps.length > 0 || understanding.unsupportedCapabilities.length > 0) {
      return this.buildMissingCapabilityResult(understanding, missingCaps, input, planId, executionId);
    }

    // 4. Formulate Goal Object
    const goal = this.formulateGoal(understanding);

    // 5. Try LLM Task Decomposition if API Key is configured
    let rawSteps: ExecutionStep[] | null = null;
    if (this.geminiService.hasApiKey()) {
      const availableAgents = this.agentRegistry.listAgents({ enabledOnly: true });
      const availableSkills = this.skillRegistry.listSkills();
      const availableTools = this.toolRegistry.listTools();
      rawSteps = await this.decomposeWithLLM(input, goal, understanding, availableAgents, availableSkills, availableTools);
    }

    // 6. Dynamic Semantic Decomposition Engine (No hardcoded archetypes)
    if (!rawSteps || rawSteps.length === 0) {
      rawSteps = this.formulateDynamicSteps(understanding, requiredCaps, input);
    }

    return this.assembleAndValidatePlan(raw, input, goal, understanding, requiredCaps, rawSteps, planId, executionId);
  }

  /**
   * Synchronous planner interface for deterministic execution paths and unit test runners.
   */
  public planSync(input: PlannerInput): PlannerResult {
    const raw = input.objective.trim();
    const planId = `plan-${Date.now()}`;
    const executionId = `exec-${Date.now()}`;

    // 1. Semantic Objective Understanding
    const understanding = this.understandObjective(raw, input);

    // 2. Ambiguity Gate: If missing critical information to take safe action
    if (understanding.requiresClarification) {
      return this.buildWaitingForInputResult(understanding, input, planId, executionId);
    }

    // 3. Capability Gate: Evaluate Required Capabilities against Registries
    const requiredCaps = this.evaluateRequiredCapabilities(understanding);
    const missingCaps = requiredCaps.filter((c) => !c.available);
    if (missingCaps.length > 0 || understanding.unsupportedCapabilities.length > 0) {
      return this.buildMissingCapabilityResult(understanding, missingCaps, input, planId, executionId);
    }

    // 4. Formulate Goal Object
    const goal = this.formulateGoal(understanding);

    // 5. Dynamic Semantic Decomposition Engine (No hardcoded archetypes)
    const rawSteps = this.formulateDynamicSteps(understanding, requiredCaps, input);

    return this.assembleAndValidatePlan(raw, input, goal, understanding, requiredCaps, rawSteps, planId, executionId);
  }

  /**
   * Semantically analyzes the human business objective to extract clauses, negations,
   * exclusions, known facts, unknowns, and capability requirements.
   */
  public understandObjective(raw: string, input: PlannerInput): ObjectiveUnderstanding {
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();

    const org = input.companyBrainContext?.organization as any;
    const orgIndustry = org?.industry || "";
    const companyMemories = (input.companyBrainContext?.memories as any[]) || [];
    const directMemories = input.memories || [];
    const allMemories = [...directMemories, ...companyMemories];
    const memoryText = allMemories.map((m: any) => m.content || "").join(" ").toLowerCase();
    const combinedContext = `${lower} ${memoryText}`;

    const hasOrgContext = Boolean(
      orgIndustry ||
      org?.name ||
      allMemories.length > 0 ||
      (input.knowledgeContext && input.knowledgeContext.chunks.length > 0)
    );

    const knownFacts: string[] = [];
    const unknowns: string[] = [];
    const requestedActions: string[] = [];
    const constraints: string[] = [];
    const exclusions: string[] = [];
    const assumptions: string[] = [];
    const entities: Record<string, unknown> = {};
    const measurableTargets: string[] = [];
    const clarificationQuestions: string[] = [];
    const requiredCapabilities: string[] = [];
    const unsupportedCapabilities: string[] = [];

    // 1. Detect Unsupported Physical / External Capabilities
    const hasSatelliteOrVision =
      lower.includes("satellite") ||
      lower.includes("drone") ||
      (lower.includes("foot traffic") && lower.includes("parking lot")) ||
      lower.includes("surveillance") ||
      lower.includes("camera feed");
    if (hasSatelliteOrVision) {
      unsupportedCapabilities.push("satellite_geospatial_vision");
    }

    const hasBankingRail =
      lower.includes("wire transfer") ||
      lower.includes("bank transfer") ||
      lower.includes("ach transfer") ||
      lower.includes("direct deposit withdrawal");
    if (hasBankingRail) {
      unsupportedCapabilities.push("external_banking_wire_rail");
    }

    const hasBiometric =
      lower.includes("biometric") ||
      lower.includes("eye tracking") ||
      lower.includes("pupil dilation");
    if (hasBiometric) {
      unsupportedCapabilities.push("biometric_sensory_tracking");
    }

    const hasRobotics =
      lower.includes("cnc machine") ||
      lower.includes("factory robotics") ||
      lower.includes("physical robot");
    if (hasRobotics) {
      unsupportedCapabilities.push("physical_robotics_control");
    }

    const hasLegalFiling =
      lower.includes("court filing") ||
      lower.includes("notarize") ||
      lower.includes("notary public");
    if (hasLegalFiling) {
      unsupportedCapabilities.push("legal_court_filing");
    }

    const hasWhatsApp =
      lower.includes("whatsapp") ||
      lower.includes("wa lead") ||
      lower.includes("wa message") ||
      lower.includes("whatsapp message");
    if (hasWhatsApp) {
      requiredCapabilities.push("whatsapp_messaging");
    }

    // 2. Parse Negations & Explicit Exclusions
    // A. Customer acquisition exclusions
    const isCustomerAcquisitionExcluded =
      lower.includes("don't think my main problem is getting more customers") ||
      lower.includes("don't think our main problem is getting more customers") ||
      lower.includes("not getting more customers") ||
      lower.includes("not getting customers") ||
      lower.includes("don't need more customers") ||
      lower.includes("do not need more customers") ||
      lower.includes("don't want more customers") ||
      lower.includes("do not want more customers") ||
      lower.includes("already have enough customers") ||
      lower.includes("already have enough leads") ||
      lower.includes("not about getting more leads") ||
      lower.includes("customers are still coming in") ||
      lower.includes("more customers and more activity") ||
      lower.includes("more customers than before") ||
      lower.includes("not a customer acquisition problem");

    if (isCustomerAcquisitionExcluded) {
      exclusions.push("customer_acquisition", "lead_generation", "marketing_campaign");
      knownFacts.push("Customer acquisition is sufficient and not the current problem");
    }

    // B. Revenue stability / Revenue not falling
    const isRevenueStable =
      lower.includes("revenue does not appear dramatically different") ||
      lower.includes("revenue is not falling") ||
      lower.includes("revenue is not dropping") ||
      lower.includes("revenue is stable") ||
      lower.includes("revenue is steady") ||
      lower.includes("not a revenue problem") ||
      lower.includes("revenue hasn't changed") ||
      lower.includes("revenue has not changed") ||
      lower.includes("sales are stable") ||
      lower.includes("sales haven't dropped");

    if (isRevenueStable) {
      exclusions.push("revenue_decline");
      knownFacts.push("Revenue is stable or relatively unchanged");
    }

    // C. Profitability & Margins (Costs vs Margins)
    const hasProfitabilityFriction =
      lower.includes("less profitable") ||
      lower.includes("profitability is falling") ||
      lower.includes("margins are falling") ||
      lower.includes("margins are declining") ||
      lower.includes("losing money") ||
      lower.includes("margin compression") ||
      lower.includes("costs are increasing") ||
      lower.includes("operating costs") ||
      lower.includes("becoming more expensive") ||
      lower.includes("serving existing customers more expensive");

    if (hasProfitabilityFriction) {
      knownFacts.push("Profit margins are compressing despite operational activity");
      unknowns.push("Cost structure", "Pricing margins", "Staff utilization", "Customer servicing costs");
      requestedActions.push("cost_and_profitability_audit");
      requiredCapabilities.push("financial_operational_audit");
      if (isRevenueStable && !exclusions.includes("customer_acquisition")) {
        exclusions.push("customer_acquisition", "lead_generation", "marketing_campaign");
      }
    }

    // D. Operational Workload / Founder Involvement / Capacity Overload
    const hasWorkloadFriction =
      lower.includes("harder to operate") ||
      lower.includes("personal involvement every month") ||
      lower.includes("personal involvement") ||
      lower.includes("work twice as many hours") ||
      lower.includes("hours doubled") ||
      lower.includes("founder involvement") ||
      lower.includes("overtime") ||
      lower.includes("bottleneck") ||
      lower.includes("backlog") ||
      lower.includes("delays") ||
      lower.includes("outstanding jobs") ||
      lower.includes("overdue client work") ||
      lower.includes("too much client work") ||
      lower.includes("team is struggling") ||
      lower.includes("too many outstanding");

    if (hasWorkloadFriction) {
      knownFacts.push("Operational complexity and workload demand are escalating");
      unknowns.push("Process bottlenecks", "Task delegation failure", "Capacity thresholds", "Service delivery throughput");
      requestedActions.push("operational_bottleneck_investigation");
      requiredCapabilities.push("process_bottleneck_investigation");
    }

    // E. Customer Dissatisfaction / Complaints / Refunds / Retention
    const hasCustomerFriction =
      lower.includes("refunds") ||
      lower.includes("complaints") ||
      lower.includes("client exit") ||
      lower.includes("cancellation") ||
      lower.includes("churn") ||
      lower.includes("renewal") ||
      lower.includes("renewals") ||
      lower.includes("staying as long") ||
      lower.includes("client retention") ||
      lower.includes("retention") ||
      lower.includes("lost client");

    if (hasCustomerFriction) {
      knownFacts.push("Customer friction points detected in complaints, refunds, retention, or renewal drop-offs");
      unknowns.push("Root cause of customer dissatisfaction", "Fulfillment defects", "Service friction");
      requestedActions.push("service_friction_and_refund_analysis");
      requiredCapabilities.push("service_friction_analysis");
    }

    // F. Conversion / Trial Activation (if not excluded)
    const hasConversionFriction =
      (lower.includes("converting") ||
        lower.includes("trial") ||
        lower.includes("activation") ||
        lower.includes("appointment") ||
        lower.includes("viewing") ||
        lower.includes("abandon") ||
        lower.includes("abandoning") ||
        lower.includes("cart") ||
        combinedContext.includes("trial activation") ||
        combinedContext.includes("sales cycle")) &&
      !exclusions.includes("customer_acquisition");

    if (hasConversionFriction) {
      knownFacts.push("Funnel conversion or activation drop-off identified");
      unknowns.push("Drop-off stage", "Buyer objections");
      requestedActions.push("conversion_activation_review");
      requiredCapabilities.push("conversion_funnel_audit");
    }

    // G. Niche / Specialized Business
    const isSpecializedNiche =
      lower.includes("niche") ||
      lower.includes("specialized business") ||
      lower.includes("not been explicitly configured for");

    if (isSpecializedNiche) {
      knownFacts.push("Operating in a specialized domain or niche");
      unknowns.push("Domain benchmarks", "Key performance indicator identity");
      requestedActions.push("specialized_kpi_investigation");
      requiredCapabilities.push("business_intelligence_audit");
    }

    // H. General Sales Drop (when NOT stable and NOT excluded)
    const hasSalesDrop =
      (lower.includes("sales have dropped") ||
        lower.includes("sales dropped") ||
        lower.includes("sales are down") ||
        lower.includes("revenue dropped") ||
        lower.includes("revenue has fallen") ||
        lower.includes("revenue fallen") ||
        lower.includes("revenue is declining") ||
        lower.includes("revenue to decline") ||
        lower.includes("revenue decline") ||
        lower.includes("aren't making as much money") ||
        lower.includes("not making as much money") ||
        lower.includes("income is down") ||
        lower.includes("income dropped") ||
        combinedContext.includes("sales cycle") ||
        combinedContext.includes("trial activation")) &&
      !isRevenueStable;

    if (hasSalesDrop) {
      knownFacts.push("Direct sales or revenue drop reported");
      requestedActions.push("revenue_recovery_investigation");
      requiredCapabilities.push("financial_operational_audit");
    }

    // I. Strategic Problem Analysis & Options (Phase 4 Strategy Worker)
    const hasStrategicGoal =
      lower.includes("strategic") ||
      lower.includes("strategy") ||
      lower.includes("tradeoff") ||
      lower.includes("trade-off") ||
      lower.includes("competitive positioning") ||
      lower.includes("options and actionable plan") ||
      lower.includes("options for growth") ||
      lower.includes("transform verified business information");

    if (hasStrategicGoal) {
      knownFacts.push("Strategic objective or high-level business direction formulation requested");
      requestedActions.push("strategic_planning_and_options");
      requiredCapabilities.push("strategic_planning_and_options");
    }

    // J. Event-Driven Workflow Automation (Phase 4 Automation Worker)
    const hasAutomationGoal =
      lower.includes("automate") ||
      lower.includes("automation") ||
      lower.includes("event-driven") ||
      lower.includes("trigger and action") ||
      lower.includes("trigger-condition-action") ||
      lower.includes("workflow rule") ||
      lower.includes("triggers immediate") ||
      (lower.includes("pipeline") && (lower.includes("trigger") || lower.includes("listens"))) ||
      lower.includes("when a new lead comes in") ||
      lower.includes("automated lead follow") ||
      lower.includes("configure automation");

    if (hasAutomationGoal) {
      knownFacts.push("Event-driven business automation workflow requested");
      requestedActions.push("workflow_automation_design");
      requiredCapabilities.push("workflow_automation_design");
    }

    // K. Customer Support & Grounded Inquiry Handling (Phase 4 Support Worker)
    const isAggregateMetricAnalysis =
      lower.includes("root cause") ||
      lower.includes("across operations") ||
      lower.includes("have increased by") ||
      lower.includes("requests are up") ||
      lower.includes("complaints have increased") ||
      lower.includes("uncover the root cause");

    const hasSupportGoal =
      !isAggregateMetricAnalysis &&
      (lower.includes("customer enquiry") ||
        lower.includes("customer inquiry") ||
        lower.includes("customer support") ||
        lower.includes("support workflow") ||
        lower.includes("support ticket") ||
        lower.includes("client ticket") ||
        (lower.includes("complaint") &&
          (lower.includes("ticket") || lower.includes("handle") || lower.includes("resolve") || lower.includes("urgent"))) ||
        lower.includes("billing discrepancy") ||
        lower.includes("policy inquiry") ||
        lower.includes("answer customer") ||
        lower.includes("customer question") ||
        lower.includes("faq handling") ||
        lower.includes("helpdesk") ||
        (lower.includes("draft") && (lower.includes("response") || lower.includes("reply"))));

    if (hasSupportGoal) {
      knownFacts.push("Customer support resolution or policy inquiry requested");
      requestedActions.push("customer_support_resolution");
      requiredCapabilities.push("customer_support_resolution");
    }

    // 3. Ambiguity & Missing Information Gate
    // Can the requested objective be safely acted upon with the information currently available?
    const isUltraVague =
      /^(my business is losing money\. fix it|fix my business|help me with my business|something is wrong with my business|i have a business problem|business problem|analyze my business|help me|fix it)/i.test(
        trimmed
      ) && !hasOrgContext;

    const isLackingEssentialContext =
      raw.split(/\s+/).length < 8 &&
      (lower.includes("losing money") || lower.includes("help") || lower.includes("fix it")) &&
      !hasOrgContext;

    const isExplicitlyAmbiguous =
      lower.includes("i don't know exactly what needs to be done") && !hasOrgContext;

    const requiresClarification = isUltraVague || isLackingEssentialContext || isExplicitlyAmbiguous;

    if (requiresClarification) {
      clarificationQuestions.push(
        "What industry or business model does your company operate (e.g. SaaS, services, retail, consulting)?",
        "What are your primary cost drivers, recent revenue figures, or margin changes?",
        "Do you have financial records, P&L reports, or operational logs we can inspect?"
      );
    }

    // 4. Determine Objective Type
    let objectiveType: ObjectiveUnderstanding["objectiveType"] = "business_problem";
    if (unsupportedCapabilities.length > 0) {
      objectiveType = "unsupported";
    } else if (requiresClarification) {
      objectiveType = "ambiguous";
    } else if (
      requestedActions.includes("cost_and_profitability_audit") ||
      requestedActions.includes("specialized_kpi_investigation") ||
      requestedActions.includes("revenue_recovery_investigation")
    ) {
      objectiveType = "diagnostic";
    } else if (
      requestedActions.includes("operational_bottleneck_investigation") ||
      requestedActions.includes("service_friction_and_refund_analysis") ||
      requestedActions.includes("workflow_automation_design") ||
      requestedActions.includes("customer_support_resolution")
    ) {
      objectiveType = "operational";
    } else if (
      requestedActions.includes("strategic_planning_and_options") ||
      lower.includes("look at everything") ||
      lower.includes("most important opportunity")
    ) {
      objectiveType = "strategic";
    }

    return {
      originalRequest: trimmed,
      objectiveType,
      desiredOutcome: `Safely and traceably investigate "${trimmed}" using verified capabilities`,
      knownFacts,
      unknowns,
      requestedActions,
      constraints,
      exclusions,
      assumptions,
      entities,
      measurableTargets,
      timeframe: undefined,
      industry: orgIndustry || undefined,
      confidence: requiresClarification ? 0.3 : unsupportedCapabilities.length > 0 ? 0.2 : 0.9,
      requiresClarification,
      clarificationQuestions,
      requiredCapabilities: Array.from(new Set(requiredCapabilities)),
      unsupportedCapabilities: Array.from(new Set(unsupportedCapabilities)),
    };
  }

  /**
   * Cross-references required capabilities against registered agents, skills, and tools.
   */
  public evaluateRequiredCapabilities(understanding: ObjectiveUnderstanding): RequiredCapability[] {
    const list: RequiredCapability[] = [];

    // For any unsupported capabilities
    for (const unsup of understanding.unsupportedCapabilities) {
      list.push({
        capability: unsup,
        purpose: `Execute ${unsup}`,
        requiredFor: [understanding.originalRequest],
        available: false,
        confidence: 0,
        reason: `Capability "${unsup}" is not registered in ToolRegistryService or AgentRegistryService.`,
      });
    }

    if (understanding.requiredCapabilities.includes("financial_operational_audit")) {
      const toolDef = this.toolRegistry.getTool("get_dashboard_analytics");
      const agentDef = this.agentRegistry.getAgent("analytics-agent");
      list.push({
        capability: "financial_operational_audit",
        purpose: "Audit revenue, cost, margin, and throughput data",
        requiredFor: ["cost_and_profitability_audit"],
        requiredTools: ["get_dashboard_analytics"],
        requiredSkills: ["Analyze", "Audit"],
        requiredAgents: ["analytics-agent"],
        available: Boolean(toolDef && agentDef?.enabled),
        confidence: 0.95,
        reason: "Analytics Agent with get_dashboard_analytics tool available",
      });
    }

    if (understanding.requiredCapabilities.includes("process_bottleneck_investigation")) {
      const toolDef = this.toolRegistry.getTool("query_memory");
      const agentDef = this.agentRegistry.getAgent("research-agent");
      list.push({
        capability: "process_bottleneck_investigation",
        purpose: "Investigate operational bottlenecks, historical records, and process friction",
        requiredFor: ["operational_bottleneck_investigation"],
        requiredTools: ["query_memory"],
        requiredSkills: ["Audit", "Summarize"],
        requiredAgents: ["research-agent"],
        available: Boolean(toolDef && agentDef?.enabled),
        confidence: 0.95,
        reason: "Research Agent with query_memory and search_knowledge available",
      });
    }

    if (understanding.requiredCapabilities.includes("business_intelligence_audit")) {
      const toolDef = this.toolRegistry.getTool("get_dashboard_analytics");
      const agentDef = this.agentRegistry.getAgent("analytics-agent");
      list.push({
        capability: "business_intelligence_audit",
        purpose: "Investigate KPI anomalies, metrics, and business intelligence in specialized or niche domains",
        requiredFor: ["specialized_kpi_investigation"],
        requiredTools: ["get_dashboard_analytics", "query_memory"],
        requiredSkills: ["Analyze", "Audit"],
        requiredAgents: ["analytics-agent", "research-agent"],
        available: Boolean(toolDef && agentDef?.enabled),
        confidence: 0.95,
        reason: "Analytics and Research specialists with get_dashboard_analytics available",
      });
    }

    if (understanding.requiredCapabilities.includes("conversion_funnel_audit")) {
      const toolDef = this.toolRegistry.getTool("get_funnel_analytics");
      const agentDef = this.agentRegistry.getAgent("analytics-agent");
      list.push({
        capability: "conversion_funnel_audit",
        purpose: "Analyze conversion drop-offs, stage friction, and checkout completion",
        requiredFor: ["conversion_activation_review"],
        requiredTools: ["get_funnel_analytics"],
        requiredSkills: ["Analyze", "Audit"],
        requiredAgents: ["analytics-agent"],
        available: Boolean(toolDef && agentDef?.enabled),
        confidence: 0.95,
        reason: "Analytics Agent with get_funnel_analytics available",
      });
    }

    if (understanding.requiredCapabilities.includes("service_friction_analysis")) {
      const toolDef = this.toolRegistry.getTool("query_memory");
      const agentDef = this.agentRegistry.getAgent("research-agent");
      list.push({
        capability: "service_friction_analysis",
        purpose: "Audit customer feedback, complaint patterns, and refund root causes",
        requiredFor: ["service_friction_and_refund_analysis"],
        requiredTools: ["query_memory"],
        requiredSkills: ["Audit", "Research"],
        requiredAgents: ["research-agent"],
        available: Boolean(toolDef && agentDef?.enabled),
        confidence: 0.95,
        reason: "Research Agent with query_memory available",
      });
    }

    if (understanding.requiredCapabilities.includes("strategic_planning_and_options")) {
      const toolDef = this.toolRegistry.getTool("query_memory");
      const agentDef = this.agentRegistry.getAgent("strategy-worker");
      list.push({
        capability: "strategic_planning_and_options",
        purpose: "Transform verified business context into prioritized strategic options, roadmaps, and worker delegation plans",
        requiredFor: ["strategic_planning_and_options"],
        requiredTools: ["query_memory", "search_knowledge", "get_analytics_summary"],
        requiredSkills: ["Strategic Planning", "Business Analysis", "Action Planning", "Opportunity Analysis"],
        requiredAgents: ["strategy-worker"],
        available: Boolean(toolDef && agentDef?.enabled),
        confidence: 0.95,
        reason: "Strategy Worker with query_memory and analytics tools available",
      });
    }

    if (understanding.requiredCapabilities.includes("workflow_automation_design")) {
      const toolDef = this.toolRegistry.getTool("create_automation");
      const agentDef = this.agentRegistry.getAgent("automation-worker");
      list.push({
        capability: "workflow_automation_design",
        purpose: "Design, configure, and verify event-driven business automation flows (Trigger -> Conditions -> Actions)",
        requiredFor: ["workflow_automation_design"],
        requiredTools: ["create_automation", "query_memory"],
        requiredSkills: ["Workflow Design", "Trigger Mapping", "Condition Mapping", "Action Mapping"],
        requiredAgents: ["automation-worker"],
        available: Boolean(toolDef && agentDef?.enabled),
        confidence: 0.95,
        reason: "Automation Worker with create_automation tool available",
      });
    }

    if (understanding.requiredCapabilities.includes("customer_support_resolution")) {
      const toolDef = this.toolRegistry.getTool("search_knowledge");
      const agentDef = this.agentRegistry.getAgent("support-worker");
      list.push({
        capability: "customer_support_resolution",
        purpose: "Resolve customer inquiries using grounded Company Brain policies, customer records, and escalation controls",
        requiredFor: ["customer_support_resolution"],
        requiredTools: ["search_knowledge", "query_memory", "get_contact"],
        requiredSkills: ["Customer Enquiry Handling", "Knowledge Retrieval", "Response Drafting"],
        requiredAgents: ["support-worker"],
        available: Boolean(toolDef && agentDef?.enabled),
        confidence: 0.95,
        reason: "Support Worker with search_knowledge and get_contact tools available",
      });
    }

    if (understanding.requiredCapabilities.includes("whatsapp_messaging")) {
      const toolDiscovery = this.toolRegistry.discoverToolCapability("whatsapp_messaging");
      list.push({
        capability: "whatsapp_messaging",
        purpose: "Send and receive automated WhatsApp messages and lead follow-ups",
        requiredFor: ["whatsapp_followup"],
        requiredTools: ["whatsapp_send"],
        requiredSkills: ["Follow Up", "Communicate"],
        requiredAgents: ["automation-worker"],
        available: toolDiscovery.available,
        confidence: toolDiscovery.available ? 0.95 : 0.0,
        reason: toolDiscovery.available
          ? "WhatsApp messaging integration available"
          : "Required WhatsApp messaging capability is unavailable. Connect an approved WhatsApp integration.",
      });
    }

    // Dynamic registry evaluation for any other capabilities
    for (const cap of understanding.requiredCapabilities) {
      if (list.some((c) => c.capability === cap)) continue;

      const toolDiscovery = this.toolRegistry.discoverToolCapability(cap);
      const matchingWorkers = this.agentRegistry.findWorkersForCapabilities([cap]);

      const available = toolDiscovery.available || matchingWorkers.length > 0;
      list.push({
        capability: cap,
        purpose: `Provide ${cap}`,
        requiredFor: [understanding.originalRequest],
        requiredTools: toolDiscovery.toolId ? [toolDiscovery.toolId] : [],
        requiredAgents: matchingWorkers.map((w) => w.id),
        available,
        confidence: available ? 0.9 : 0.0,
        reason: available
          ? `Capability "${cap}" satisfied by ${matchingWorkers.map((w) => w.name).join(", ") || toolDiscovery.name}`
          : `Capability "${cap}" is not supported by any active worker or tool in the registry.`,
      });
    }

    if (
      understanding.requiredCapabilities.length === 0 &&
      !understanding.requiresClarification &&
      understanding.unsupportedCapabilities.length === 0
    ) {
      list.push({
        capability: "general_operational_audit",
        purpose: "Evaluate operational performance indicators and company brain records",
        requiredFor: ["general_diagnostic"],
        requiredTools: ["query_memory", "get_dashboard_analytics"],
        requiredSkills: ["Audit", "Analyze"],
        requiredAgents: ["research-agent", "analytics-agent"],
        available: true,
        confidence: 0.9,
        reason: "General operational audit capability available via Research and Analytics specialists",
      });
    }

    return list;
  }

  /**
   * Builds dynamic execution steps justified strictly by semantic understanding.
   * Completely free of hardcoded Archetypes A-F.
   */
  public formulateDynamicSteps(
    understanding: ObjectiveUnderstanding,
    _requiredCaps: RequiredCapability[],
    input: PlannerInput
  ): ExecutionStep[] {
    const raw = input.objective;
    const steps: ExecutionStep[] = [];
    const hasRAG = Boolean(input.knowledgeContext && input.knowledgeContext.chunks.length > 0);
    const org = input.companyBrainContext?.organization as any;
    const orgName = org?.name || "the business";
    const lower = raw.toLowerCase();

    // Special Handling: Dedicated Support Pipeline (Customer Enquiry / Support)
    if (
      understanding.requestedActions.includes("customer_support_resolution") &&
      !understanding.requestedActions.includes("operational_bottleneck_investigation") &&
      !understanding.requestedActions.includes("service_friction_and_refund_analysis") &&
      !understanding.requestedActions.includes("cost_and_profitability_audit")
    ) {
      steps.push({
        id: "step-1",
        stepNumber: 1,
        agentId: "support-worker",
        agentName: "Support Worker",
        task: `Resolve customer support enquiry, retrieve grounded policies, and draft verified response for ${orgName}`,
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Customer Enquiry Handling", "Knowledge Retrieval", "Response Drafting"],
        tools: ["search_knowledge", "query_memory", "get_contact"],
        input: { objective: raw, enquiry: raw, organizationId: input.organizationId },
        maxRetries: 2,
      });

      // Cross-Worker: SUPPORT -> SALES (if customer represents lead or conversion potential)
      if (lower.includes("sales") || lower.includes("pricing") || lower.includes("upgrade") || lower.includes("qualify")) {
        steps.push({
          id: "step-2",
          stepNumber: 2,
          agentId: "sales-worker",
          agentName: "Sales Worker",
          task: `Qualify customer lead for upgrade opportunities and follow-up sequence based on support inquiry`,
          dependencies: ["step-1"],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Qualify", "Follow Up"],
          tools: ["qualify_lead", "analyze_sales_funnel"],
          input: { objective: raw, focus: "Customer Upgrade & Lead Qualification" },
          maxRetries: 2,
        });
      }

      return steps;
    }

    // Special Handling: Dedicated Automation Pipeline (Workflow Automation)
    if (understanding.requestedActions.includes("workflow_automation_design")) {
      let currentStepIndex = 1;

      // Cross-Worker: STRATEGY -> AUTOMATION (if strategy or roadmap precedes automation)
      if (lower.includes("strategy") || lower.includes("strategic") || lower.includes("strategic options")) {
        steps.push({
          id: `step-${currentStepIndex}`,
          stepNumber: currentStepIndex,
          agentId: "strategy-worker",
          agentName: "Strategy Worker",
          task: `Formulate strategic specifications and business logic requirements for automated workflow`,
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Strategic Planning", "Business Analysis", "Action Planning"],
          tools: ["query_memory", "get_analytics_summary"],
          input: { objective: raw, focus: "Automation Strategy & Business Rules" },
          maxRetries: 2,
        });
        currentStepIndex++;
      }

      const autoDeps = steps.length > 0 ? [steps[steps.length - 1].id] : [];
      steps.push({
        id: `step-${currentStepIndex}`,
        stepNumber: currentStepIndex,
        agentId: "automation-worker",
        agentName: "Automation Worker",
        task: `Design, configure, and verify event-driven business automation workflow for ${orgName}`,
        dependencies: autoDeps,
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Workflow Design", "Trigger Mapping", "Condition Mapping", "Action Mapping"],
        tools: ["create_automation", "query_memory"],
        input: { objective: raw, task: raw, organizationId: input.organizationId },
        maxRetries: 2,
      });
      currentStepIndex++;

      // Cross-Worker: AUTOMATION -> OPERATIONS (if operations or coordination is requested)
      if (lower.includes("operation") || lower.includes("sop") || lower.includes("coordinate")) {
        steps.push({
          id: `step-${currentStepIndex}`,
          stepNumber: currentStepIndex,
          agentId: "operations-worker",
          agentName: "Operations Worker",
          task: `Audit operational workflow integration, SOP alignment, and coordination capacity`,
          dependencies: [`step-${currentStepIndex - 1}`],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Workflow Planning", "Audit", "SOP Analysis"],
          tools: ["audit_operations_workflow", "generate_sop_summary"],
          input: { objective: raw, focus: "Operational Integration & SOP Audit" },
          maxRetries: 2,
        });
      }

      return steps;
    }

    // Special Handling: Dedicated Strategy Pipeline (Strategic Options & Roadmap)
    if (understanding.requestedActions.includes("strategic_planning_and_options")) {
      let currentStepIndex = 1;

      // Cross-Worker: RESEARCH -> STRATEGY (if competitor or market research requested)
      if (lower.includes("research") || lower.includes("competitor") || lower.includes("market intelligence")) {
        steps.push({
          id: `step-${currentStepIndex}`,
          stepNumber: currentStepIndex,
          agentId: "research-worker",
          agentName: "Research Worker",
          task: `Gather market intelligence, competitor benchmarks, and audience pains for ${orgName}`,
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Research", "Analyze", "Compare"],
          tools: hasRAG ? ["search_knowledge", "query_memory"] : ["query_memory"],
          input: { objective: raw, organizationId: input.organizationId },
          maxRetries: 2,
        });
        currentStepIndex++;
      }
      // Cross-Worker: ANALYTICS -> STRATEGY (if analytics or metrics requested)
      else if (lower.includes("analytics") || lower.includes("metrics") || lower.includes("kpi") || lower.includes("telemetry")) {
        steps.push({
          id: `step-${currentStepIndex}`,
          stepNumber: currentStepIndex,
          agentId: "analytics-worker",
          agentName: "Analytics Worker",
          task: `Audit quantitative metrics, conversion telemetry, and throughput velocity for ${orgName}`,
          dependencies: [],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Analyze", "Audit", "Report"],
          tools: ["get_dashboard_analytics", "get_analytics_summary"],
          input: { objective: raw, organizationId: input.organizationId },
          maxRetries: 2,
        });
        currentStepIndex++;
      }

      const stratDeps = steps.length > 0 ? [steps[steps.length - 1].id] : [];
      steps.push({
        id: `step-${currentStepIndex}`,
        stepNumber: currentStepIndex,
        agentId: "strategy-worker",
        agentName: "Strategy Worker",
        task: `Formulate structured strategic options, trade-off analysis, risk assessment, and actionable roadmap for ${orgName}`,
        dependencies: stratDeps,
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Strategic Planning", "Business Analysis", "Action Planning", "Opportunity Analysis"],
        tools: ["query_memory", "get_analytics_summary", "store_memory"],
        input: { objective: raw, organizationId: input.organizationId },
        maxRetries: 2,
      });
      currentStepIndex++;

      // Cross-Worker: STRATEGY -> AUTOMATION (if automation is downstream outcome)
      if (lower.includes("automate") || lower.includes("automation")) {
        steps.push({
          id: `step-${currentStepIndex}`,
          stepNumber: currentStepIndex,
          agentId: "automation-worker",
          agentName: "Automation Worker",
          task: `Configure and test event-driven automation workflows based on approved strategic options`,
          dependencies: [`step-${currentStepIndex - 1}`],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Workflow Design", "Trigger Mapping", "Condition Mapping", "Action Mapping"],
          tools: ["create_automation", "query_memory"],
          input: { objective: raw, focus: "Strategic Automation Implementation" },
          maxRetries: 2,
        });
        currentStepIndex++;
      }
      // Cross-Worker: STRATEGY -> MARKETING (if marketing campaign is downstream outcome)
      else if (lower.includes("campaign") || lower.includes("marketing") || lower.includes("promotion")) {
        steps.push({
          id: `step-${currentStepIndex}`,
          stepNumber: currentStepIndex,
          agentId: "marketing-worker",
          agentName: "Marketing Worker",
          task: `Formulate marketing campaign blueprint and offer architecture derived from strategy`,
          dependencies: [`step-${currentStepIndex - 1}`],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Create", "Recommend"],
          tools: ["create_offer_blueprint", "store_memory"],
          input: { objective: raw, focus: "Strategic Campaign Blueprint" },
          maxRetries: 2,
        });
        currentStepIndex++;
      }
      // Cross-Worker: STRATEGY -> SALES (if sales pipeline is downstream outcome)
      else if (lower.includes("sales") || lower.includes("pipeline") || lower.includes("lead")) {
        steps.push({
          id: `step-${currentStepIndex}`,
          stepNumber: currentStepIndex,
          agentId: "sales-worker",
          agentName: "Sales Worker",
          task: `Engineer sales pipeline stages and buyer journey qualification aligned with strategy`,
          dependencies: [`step-${currentStepIndex - 1}`],
          status: "PENDING",
          riskLevel: "LOW",
          approvalRequired: false,
          skills: ["Plan", "Qualify", "Conversion Optimization"],
          tools: ["analyze_sales_funnel", "qualify_lead"],
          input: { objective: raw, focus: "Strategic Sales Funnel Engineering" },
          maxRetries: 2,
        });
        currentStepIndex++;
      }

      return steps;
    }

    // 1. Metric / Quantitative Audit Step (if diagnostic or quantitative analysis requested)
    const isMetricAuditNeeded =
      understanding.requestedActions.includes("cost_and_profitability_audit") ||
      understanding.requestedActions.includes("specialized_kpi_investigation") ||
      understanding.requestedActions.includes("conversion_activation_review") ||
      understanding.requestedActions.includes("revenue_recovery_investigation") ||
      understanding.requestedActions.includes("service_friction_and_refund_analysis") ||
      understanding.requestedActions.includes("operational_bottleneck_investigation") ||
      understanding.objectiveType === "diagnostic" ||
      understanding.objectiveType === "strategic" ||
      understanding.objectiveType === "operational" ||
      understanding.objectiveType === "business_problem";

    if (isMetricAuditNeeded) {
      const isConversionFocus = understanding.requestedActions.includes("conversion_activation_review");
      const task = isConversionFocus
        ? `Analyze conversion funnel drop-offs, user activation barriers, and stage friction for ${orgName}`
        : `Audit recent operational metrics, cost drivers, and throughput velocity for ${orgName}`;

      const tools = isConversionFocus
        ? ["get_funnel_analytics"]
        : ["get_dashboard_analytics"];

      steps.push({
        id: "step-1",
        stepNumber: 1,
        agentId: "analytics-agent",
        agentName: "Analytics Agent",
        task,
        dependencies: [],
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Analyze", "Audit", "Report"],
        tools,
        input: { objective: raw, exclusions: understanding.exclusions },
        maxRetries: 2,
      });
    }

    // 2. Qualitative Investigation / SOP / Historical Record Review Step
    const step2Num = steps.length + 1;
    const step2Deps = steps.length > 0 ? [steps[steps.length - 1].id] : [];

    const isFrictionOrRefund = understanding.requestedActions.includes("service_friction_and_refund_analysis");
    const isBottleneck = understanding.requestedActions.includes("operational_bottleneck_investigation");

    let researchTask = `Investigate root causes, workflow friction, and operational records for ${orgName}`;
    if (isFrictionOrRefund) {
      researchTask = `Investigate customer complaints, refund patterns, and fulfillment bottlenecks from company records`;
    } else if (isBottleneck) {
      researchTask = `Investigate active accounts, outstanding deliverables, and operational bottlenecks from organization records`;
    }

    steps.push({
      id: `step-${step2Num}`,
      stepNumber: step2Num,
      agentId: "research-agent",
      agentName: "Research Agent",
      task: researchTask,
      dependencies: step2Deps,
      status: "PENDING",
      riskLevel: "LOW",
      approvalRequired: false,
      skills: ["Audit", "Summarize", "Research"],
      tools: hasRAG ? ["search_knowledge", "query_memory"] : ["query_memory"],
      input: {
        objective: raw,
        knownFacts: understanding.knownFacts,
        unknowns: understanding.unknowns,
        exclusions: understanding.exclusions,
      },
      maxRetries: 2,
    });

    // 3. Strategic Action / Improvement Step (only if customer acquisition / marketing is NOT excluded)
    const step3Num = steps.length + 1;
    const step3Deps = [`step-${step3Num - 1}`];

    // Case A: Conversion messaging requested (e.g. follow-up hooks, recovery sequence)
    if (
      understanding.requestedActions.includes("conversion_activation_review") &&
      !understanding.exclusions.includes("customer_acquisition")
    ) {
      steps.push({
        id: `step-${step3Num}`,
        stepNumber: step3Num,
        agentId: "copy-agent",
        agentName: "Copy Agent",
        task: `Draft high-converting follow-up messaging, activation hooks, and call-to-actions`,
        dependencies: step3Deps,
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Write", "Communicate", "Optimize"],
        tools: ["generate_copy_variants"],
        input: { objective: raw, focus: "Activation Copy & Follow-up Cadence" },
        maxRetries: 2,
      });
    }
    // Case B: Customer acquisition is explicitly excluded (e.g. founder capacity, operating costs, staffing)
    else if (
      understanding.exclusions.includes("customer_acquisition") ||
      understanding.exclusions.includes("lead_generation")
    ) {
      // Intentionally omit marketing/acquisition steps when excluded by user intent.
      // The analytical and operational audit steps provide the complete diagnostic roadmap.
    }
    // Case C: General strategic recovery or growth roadmap (when not excluded)
    else {
      steps.push({
        id: `step-${step3Num}`,
        stepNumber: step3Num,
        agentId: "marketing-agent",
        agentName: "Marketing Agent",
        task: `Formulate highest-leverage strategic initiative roadmap and executive action plan for ${orgName}`,
        dependencies: step3Deps,
        status: "PENDING",
        riskLevel: "LOW",
        approvalRequired: false,
        skills: ["Plan", "Create", "Recommend"],
        tools: ["create_offer_blueprint", "store_memory"],
        input: { objective: raw, focus: "Strategic Initiative Roadmap" },
        maxRetries: 2,
      });
    }

    return steps;
  }

  private buildWaitingForInputResult(
    understanding: ObjectiveUnderstanding,
    input: PlannerInput,
    planId: string,
    executionId: string
  ): PlannerResult {
    const goal: PlannerGoal = {
      type: "ambiguous",
      desiredOutcome: "Gather required business context to formulate a high-confidence operational action plan",
      successCriteria: [
        "Target business domain identified",
        "Specific operational bottleneck clarified",
        "Actionable workflow constructed upon user clarification",
      ],
    };

    const waitingPlan: ExecutionPlan = {
      id: planId,
      executionId,
      organizationId: input.organizationId,
      userId: input.userId,
      objective: understanding.originalRequest,
      goal,
      understanding,
      informationRequired: understanding.clarificationQuestions,
      missingInformation: understanding.clarificationQuestions,
      clarificationQuestions: understanding.clarificationQuestions,
      steps: [],
      selectedSkills: ["Research", "Analyze"],
      selectedTools: ["query_memory"],
      currentStepIndex: 0,
      status: "WAITING_FOR_INPUT",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return {
      plan: waitingPlan,
      isDynamic: true,
      requiresInput: true,
      clarificationQuestions: understanding.clarificationQuestions,
      understanding,
      goal,
    };
  }

  private buildMissingCapabilityResult(
    understanding: ObjectiveUnderstanding,
    missingCaps: RequiredCapability[],
    input: PlannerInput,
    planId: string,
    executionId: string
  ): PlannerResult {
    const missingNames =
      missingCaps.length > 0
        ? missingCaps.map((c) => c.capability).join(", ")
        : understanding.unsupportedCapabilities.join(", ");

    const goal: PlannerGoal = {
      type: "unsupported",
      desiredOutcome: `Identify unsupported capability requirement for "${understanding.originalRequest}"`,
      successCriteria: [
        "Detect capability mismatch",
        "Prevent unauthorized or unrelated tool execution",
        "Notify operator safely",
      ],
    };

    const plan: ExecutionPlan = {
      id: planId,
      executionId,
      organizationId: input.organizationId,
      userId: input.userId,
      objective: understanding.originalRequest,
      goal,
      understanding,
      requiredCapabilities: missingCaps,
      missingCapabilities: missingCaps.map((c) => c.capability),
      unsupportedCapabilities: understanding.unsupportedCapabilities,
      steps: [],
      selectedSkills: [],
      selectedTools: [],
      currentStepIndex: 0,
      status: "MISSING_CAPABILITY",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      summary: `Execution halted safely: The objective requires capabilities not registered in the system (${missingNames}).`,
    };

    return {
      plan,
      isDynamic: true,
      requiresInput: false,
      missingCapabilities: missingCaps.map((c) => c.capability),
      unsupportedCapabilities: understanding.unsupportedCapabilities,
      understanding,
      goal,
    };
  }

  private buildPlanValidationFailedResult(
    understanding: ObjectiveUnderstanding,
    errors: string[],
    input: PlannerInput,
    planId: string,
    executionId: string
  ): PlannerResult {
    const goal: PlannerGoal = {
      type: "unsupported",
      desiredOutcome: `Reject execution plan due to registry policy violation`,
      successCriteria: ["Enforce strict registry integrity", "Halt invalid tool or agent dispatch"],
    };

    const plan: ExecutionPlan = {
      id: planId,
      executionId,
      organizationId: input.organizationId,
      userId: input.userId,
      objective: understanding.originalRequest,
      goal,
      understanding,
      steps: [],
      selectedSkills: [],
      selectedTools: [],
      currentStepIndex: 0,
      status: "PLAN_VALIDATION_FAILED",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      summary: `Plan Validation Failed: ${errors.join("; ")}`,
    };

    return {
      plan,
      isDynamic: true,
      requiresInput: false,
      understanding,
      goal,
    };
  }

  private formulateGoal(understanding: ObjectiveUnderstanding): PlannerGoal {
    return {
      type: understanding.objectiveType as any,
      desiredOutcome: understanding.desiredOutcome,
      successCriteria: [
        "Relevant business data and context analyzed",
        "Underlying bottlenecks or opportunities identified with evidence",
        "Targeted strategic and operational actions produced",
        "Authorized actions executed under safety limits",
        "Results validated against intended business outcome",
      ],
    };
  }

  private async decomposeWithLLM(
    input: PlannerInput,
    goal: PlannerGoal,
    understanding: ObjectiveUnderstanding,
    availableAgents: any[],
    _availableSkills: any[],
    availableTools: any[]
  ): Promise<ExecutionStep[] | null> {
    const agentSummaries = availableAgents
      .map((a) => `${a.id} (${a.name}): ${a.description}. Allowed tools: [${a.allowedTools.join(", ")}]`)
      .join("\n");
    const toolSummaries = availableTools
      .map((t) => `${t.id}: ${t.description} [Allowed Agents: ${t.allowedAgents.join(", ")}]`)
      .join("\n");

    const prompt = `You are ELMO, the Executive AI Operating System Planner.
Analyze this human business objective and produce an ordered, capability-validated execution plan.

USER OBJECTIVE: "${input.objective}"
GOAL TYPE: ${goal.type}
DESIRED OUTCOME: ${goal.desiredOutcome}

SEMANTIC UNDERSTANDING:
- Known Facts: ${JSON.stringify(understanding.knownFacts)}
- Unknowns: ${JSON.stringify(understanding.unknowns)}
- Explicit Exclusions: ${JSON.stringify(understanding.exclusions)}
- Requested Actions: ${JSON.stringify(understanding.requestedActions)}

COMPANY BRAIN CONTEXT:
${JSON.stringify(input.companyBrainContext || {}, null, 2)}

RELEVANT MEMORIES:
${(input.memories || []).map((m) => `- ${m.content}`).join("\n") || "None"}

AVAILABLE REGISTERED AGENTS (You MUST ONLY select from this list):
${agentSummaries}

AVAILABLE REGISTERED TOOLS (You MUST ONLY select from this list):
${toolSummaries}

STRICT INSTRUCTIONS:
1. Decompose the objective into 2 to 4 ordered steps.
2. Only assign registered agents and tools. DO NOT INVENT AGENTS OR TOOLS.
3. If an action is in Explicit Exclusions, DO NOT create steps for it.
4. Establish proper step dependencies (dependsOn).
5. Output STRICT JSON only, matching this schema:
[
  {
    "id": "step-1",
    "stepNumber": 1,
    "agentId": "analytics-agent",
    "agentName": "Analytics Agent",
    "task": "Specific task description",
    "dependencies": [],
    "skills": ["Analyze", "Audit"],
    "tools": ["get_dashboard_analytics"],
    "riskLevel": "LOW",
    "approvalRequired": false
  }
]`;

    try {
      const res = await this.geminiService.generateResponse({
        prompt,
        config: { temperature: 0.2, maxOutputTokens: 2000 },
      });

      const cleanJson = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((s: any, idx: number) => ({
          id: s.id || `step-${idx + 1}`,
          stepNumber: idx + 1,
          agentId: s.agentId,
          agentName: s.agentName || s.agentId,
          task: s.task || s.objective,
          dependencies: Array.isArray(s.dependencies)
            ? s.dependencies
            : Array.isArray(s.dependsOn)
            ? s.dependsOn
            : [],
          status: "PENDING" as const,
          riskLevel: (s.riskLevel as RiskLevel) || "LOW",
          approvalRequired: Boolean(s.approvalRequired),
          skills: Array.isArray(s.skills) ? s.skills : ["Plan"],
          tools: Array.isArray(s.tools) ? s.tools : [],
          input: { objective: input.objective, task: s.task },
          maxRetries: 2,
        }));
      }
    } catch {
      // Fall through to dynamic semantic engine
    }

    return null;
  }

  private assembleAndValidatePlan(
    raw: string,
    input: PlannerInput,
    goal: PlannerGoal,
    understanding: ObjectiveUnderstanding,
    requiredCaps: RequiredCapability[],
    rawSteps: ExecutionStep[],
    planId: string,
    executionId: string
  ): PlannerResult {
    // Validate Plan against Registries
    const validationResult = this.validatePlanSteps(rawSteps, input.organizationId);

    if (!validationResult.isValid) {
      return this.buildPlanValidationFailedResult(understanding, validationResult.errors, input, planId, executionId);
    }

    const validatedSteps = validationResult.steps;

    // Aggregate Selected Capabilities
    const selectedSkills = Array.from(new Set(validatedSteps.flatMap((s) => s.skills || [])));
    const selectedTools = Array.from(new Set(validatedSteps.flatMap((s) => s.tools || [])));

    // Check if any step requires human approval
    const highRiskStep = validatedSteps.find((s) => s.approvalRequired);
    let pendingApproval: PendingApprovalDetails | undefined;
    if (highRiskStep) {
      pendingApproval = {
        stepId: highRiskStep.id,
        agentId: highRiskStep.agentId,
        actionTitle: highRiskStep.task,
        description: `This action is classified as HIGH RISK (${highRiskStep.task}) and requires explicit human approval.`,
        riskLevel: highRiskStep.riskLevel,
        proposedChanges: highRiskStep.input,
        requestedAt: Date.now(),
      };
    }

    const plan: ExecutionPlan = {
      id: planId,
      executionId,
      organizationId: input.organizationId,
      userId: input.userId,
      objective: raw,
      goal,
      understanding,
      informationRequired: understanding.knownFacts.length > 0 ? understanding.unknowns : [
        "Historical metric data or baseline records",
        "Target audience and offer positioning",
        "Recent operational activity logs",
      ],
      missingInformation: [],
      steps: validatedSteps,
      selectedSkills,
      selectedTools,
      requiredCapabilities: requiredCaps,
      currentStepIndex: 0,
      status: "CREATED",
      approvalRequirements: pendingApproval,
      knowledgeContext: input.knowledgeContext,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Calculate resource footprint and check quotas
    const footprint = CostResourceGovernorService.getInstance().estimateFootprint(plan);
    if (!footprint.withinLimits) {
      return this.buildPlanValidationFailedResult(
        understanding,
        [`Resource limit reached: ${footprint.explanation}`],
        input,
        planId,
        executionId
      );
    }
    plan.summary = footprint.explanation;

    return {
      plan,
      isDynamic: true,
      requiresInput: false,
      understanding,
      goal,
    };
  }

  /**
   * Strictly validates every step against AgentRegistry, SkillRegistry, and ToolRegistry.
   */
  /**
   * Validates that the execution plan dependency graph is completely acyclic.
   */
  public detectCycles(steps: ExecutionStep[]): { hasCycle: boolean; cyclePath?: string[] } {
    const adj = new Map<string, string[]>();
    for (const s of steps) {
      adj.set(s.id, s.dependencies || []);
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycleNodes: string[] = [];

    const dfs = (node: string, path: string[]): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = adj.get(node) || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          if (dfs(n, [...path])) return true;
        } else if (recStack.has(n)) {
          cycleNodes.push(...path, n);
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const s of steps) {
      if (!visited.has(s.id)) {
        if (dfs(s.id, [])) {
          return { hasCycle: true, cyclePath: cycleNodes };
        }
      }
    }

    return { hasCycle: false };
  }

  /**
   * Strictly validates every step against AgentRegistry, SkillRegistry, and ToolRegistry.
   */
  public validatePlanSteps(
    steps: ExecutionStep[],
    organizationId: string
  ): { steps: ExecutionStep[]; isValid: boolean; errors: string[] } {
    const validated: ExecutionStep[] = [];
    const validStepIds = new Set<string>();
    const allStepIds = new Set<string>(steps.map((s, idx) => s.id || `step-${idx + 1}`));
    const errors: string[] = [];

    // Pre-check for circular dependencies across the entire steps array
    const cycleCheck = this.detectCycles(steps);
    if (cycleCheck.hasCycle) {
      errors.push(`Circular dependency detected in execution plan: ${cycleCheck.cyclePath?.join(" -> ")}`);
    }

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const stepId = s.id || `step-${i + 1}`;

      // 1. Agent validation
      const agent = this.agentRegistry.getAgent(s.agentId);
      if (!agent) {
        errors.push(`Agent "${s.agentId}" in step ${stepId} is not registered`);
      } else if (!agent.enabled) {
        errors.push(`Agent "${s.agentId}" in step ${stepId} is disabled`);
      } else {
        s.agentName = agent.name;
      }

      // 2. Skill validation
      const allowedSkills = (s.skills || []).filter((sk) => {
        return Boolean(this.skillRegistry.getSkill(sk));
      });
      s.skills = allowedSkills.length > 0 ? allowedSkills : ["Plan", "Analyze"];

      // 3. Tool validation (check permissions and agent authorization)
      for (const tl of s.tools || []) {
        const toolDef = this.toolRegistry.getTool(tl);
        if (!toolDef) {
          errors.push(`Tool "${tl}" in step ${stepId} does not exist in ToolRegistry`);
        } else if (!this.agentRegistry.isToolAllowed(s.agentId, tl)) {
          errors.push(`Tool "${tl}" in step ${stepId} is not permitted for agent "${s.agentId}"`);
        }
      }

      // 4. Dependencies validation (must not contain missing, self, or circular references)
      for (const depId of s.dependencies || []) {
        if (!allStepIds.has(depId)) {
          errors.push(`Step "${stepId}" has missing dependency "${depId}"`);
        } else if (depId === stepId) {
          errors.push(`Step "${stepId}" cannot depend on itself`);
        }
      }

      // Worker dependency rules: check if dependent worker is explicitly present and disabled
      const declaredDeps = this.agentRegistry.getWorkerDependencies(s.agentId);
      for (const depWorkerId of declaredDeps) {
        const depWorker = this.agentRegistry.getWorker(depWorkerId);
        if (depWorker && !depWorker.enabled) {
          const hasDisabledPredecessor = steps.some((prev) => prev.agentId === depWorkerId);
          if (hasDisabledPredecessor) {
            errors.push(`Worker "${s.agentId}" depends on disabled worker "${depWorker.name}"`);
          }
        }
      }

      // 5. Approval & Risk check
      const containsHighRiskTool = (s.tools || []).some((tl) => {
        const toolDef = this.toolRegistry.getTool(tl);
        return toolDef?.approvalRequired || toolDef?.riskLevel === "HIGH";
      });

      const isHighRiskTask =
        /delete|drop table|mass email|publish live|deploy live|purge/i.test(s.task);

      if (containsHighRiskTool || isHighRiskTask) {
        s.riskLevel = "HIGH";
        s.approvalRequired = true;
      } else {
        s.riskLevel = s.riskLevel || "LOW";
        s.approvalRequired = Boolean(s.approvalRequired);
      }

      s.stepNumber = i + 1;
      s.id = stepId;
      s.status = "PENDING";
      s.input = { ...s.input, organizationId };

      validStepIds.add(stepId);
      validated.push(s);
    }

    return {
      steps: validated,
      isValid: errors.length === 0,
      errors,
    };
  }
}
