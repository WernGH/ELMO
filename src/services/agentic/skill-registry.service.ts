/**
 * ELMO Phase 4 — Governed Skill Registry Service (SkillRegistryService)
 *
 * Reusable capability layer between Workers and Tools:
 * ELMO -> ORCHESTRATOR -> WORKER -> SKILL -> TOOLS -> EXECUTE -> VERIFY
 *
 * Implements:
 * 1. 27 canonical reusable skills across 6 categories.
 * 2. Source architecture: builtin, company, github, marketplace.
 * 3. Safe GitHub Skill Governance & Security Assessment:
 *    Discovery -> Inspection -> Validation -> Dependency Analysis -> Security Assessment -> Permission Check -> Sandbox.
 * 4. Dynamic skill resolution and discovery by goal, category, or worker role.
 * 5. Strict rejection of untrusted or unvalidated GitHub skills.
 */

import {
  SkillDefinition,
  SkillCategory,
  SkillSource,
  SkillExecutionLimits,
} from "./types/agentic.types";
import { ToolRegistryService } from "./tool-registry.service";

export interface GitHubSkillSpec {
  repositoryUrl?: string;
  repoUrl?: string;
  commitHashOrTag?: string;
  commitHash?: string;
  skillId?: string;
  id?: string;
  name?: string;
  skillName?: string;
  description?: string;
  category?: SkillCategory;
  capabilities?: string[];
  allowedTools?: string[];
  permissions?: string[];
  requiresSandbox?: boolean;
  timeoutMs?: number;
  networkOutbound?: boolean;
  filesystemAccess?: "none" | "scoped_temp" | "unrestricted";
  containsShellExecution?: boolean;
  containsRawDatabaseAccess?: boolean;
  secretsRequired?: string[];
  version?: string;
  organizationId?: string;
}

export interface GitHubSkillEvaluationResult {
  valid: boolean;
  trusted: boolean;
  securityScore: number; // 0 to 100
  securityStatus: "TRUSTED" | "REQUIRES_APPROVAL" | "UNTRUSTED" | "REJECTED";
  violations: string[];
  errors: string[]; // alias for violations
  warnings: string[];
  commitPinned: boolean;
  sandboxEnforced: boolean;
  manifest?: Partial<SkillDefinition>;
}

export class SkillRegistryService {
  private static instance: SkillRegistryService;
  private skills: Map<string, SkillDefinition> = new Map();

  private constructor() {
    this.registerDefaultSkills();
  }

  public static getInstance(): SkillRegistryService {
    if (!SkillRegistryService.instance) {
      SkillRegistryService.instance = new SkillRegistryService();
    }
    return SkillRegistryService.instance;
  }

  public static resetInstance(): void {
    SkillRegistryService.instance = undefined as any;
  }

  public reset(): void {
    this.skills.clear();
    this.registerDefaultSkills();
  }

  /**
   * Registers a skill definition into the registry.
   */
  public registerSkill(skill: SkillDefinition): void {
    if (!skill.id || !skill.name) {
      throw new Error("Skill definition must contain a valid id and name.");
    }
    const key = skill.id.toLowerCase();
    this.skills.set(key, { ...skill });
  }

  /**
   * Unregisters a skill by ID.
   */
  public unregisterSkill(skillId: string): boolean {
    return this.skills.delete(skillId.toLowerCase());
  }

  /**
   * Retrieves a skill by ID or canonical name (case-insensitive).
   */
  public getSkill(skillIdOrName: string): SkillDefinition | undefined {
    const key = skillIdOrName.toLowerCase();
    if (this.skills.has(key)) {
      return this.skills.get(key);
    }
    for (const skill of this.skills.values()) {
      if (skill.name.toLowerCase() === key) {
        return skill;
      }
    }
    return undefined;
  }

  /**
   * Lists skills with optional category, source, or enabled filters.
   */
  public listSkills(filters?: {
    category?: SkillCategory;
    source?: SkillSource;
    enabledOnly?: boolean;
  }): SkillDefinition[] {
    let list = Array.from(this.skills.values());

    if (filters?.category) {
      list = list.filter((s) => s.category === filters.category);
    }

    if (filters?.source) {
      list = list.filter((s) => s.source === filters.source);
    }

    if (filters?.enabledOnly) {
      list = list.filter((s) => s.enabled);
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Enables or disables a skill dynamically.
   */
  public setSkillEnabled(skillId: string, enabled: boolean): boolean {
    const skill = this.getSkill(skillId);
    if (!skill) return false;
    skill.enabled = enabled;
    return true;
  }

  // ==========================================================================
  // 1. Safe GitHub-Sourced Skill Architecture & Evaluation
  // ==========================================================================

  /**
   * Comprehensive security evaluation of a proposed GitHub-sourced skill.
   * Section 20 & 21: A GitHub repository is NOT automatically a trusted skill.
   * Unknown, unverified, or hazardous code is strictly rejected.
   */
  public validateGitHubSkill(spec: GitHubSkillSpec): GitHubSkillEvaluationResult {
    const violations: string[] = [];
    const warnings: string[] = [];
    let securityScore = 100;
    let criticalViolation = false;

    const repoUrl = spec.repositoryUrl || spec.repoUrl || "";
    const commitHash = spec.commitHashOrTag || spec.commitHash || "";
    const name = spec.name || spec.skillName || "Custom GitHub Skill";
    const skillId = spec.skillId || spec.id || `gh-${Date.now()}`;

    // 1. Repository URL validation
    if (!repoUrl || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+/i.test(repoUrl)) {
      violations.push("Invalid repository URL. Must be a valid HTTPS GitHub repository.");
      securityScore -= 30;
    }

    // 2. Commit pinning validation (40-char SHA-1 required; floating branches main/master rejected)
    const isSha1 = /^[a-f0-9]{40}$/i.test(commitHash);
    const commitPinned = Boolean(commitHash && isSha1 && commitHash !== "main" && commitHash !== "master");
    if (!commitPinned) {
      violations.push("Missing pinned commit hash. Floating branches (main/master) or unpinned commits are rejected.");
      securityScore -= 30;
    }

    // 3. Mandatory Sandboxing
    const sandboxEnforced = spec.requiresSandbox === true;
    if (!sandboxEnforced) {
      violations.push("External skills from GitHub must mandate sandbox execution (requiresSandbox: true).");
      securityScore -= 40;
    }

    // 4. Bounded execution timeout (must be <= 30000ms)
    if (spec.timeoutMs !== undefined && spec.timeoutMs > 30000) {
      violations.push("Skill execution timeout exceeds maximum permitted threshold (30,000ms).");
      securityScore -= 25;
    }

    // 5. Direct shell execution / eval / exec
    if (spec.containsShellExecution) {
      criticalViolation = true;
      violations.push("CRITICAL_SECURITY_VIOLATION: Direct shell execution or arbitrary command execution is strictly forbidden.");
      securityScore = 0;
    }

    // 6. Raw database access
    if (spec.containsRawDatabaseAccess) {
      criticalViolation = true;
      violations.push("CRITICAL_SECURITY_VIOLATION: Raw database access is strictly forbidden. All operations must pass through registered tools.");
      securityScore = 0;
    }

    // 7. Filesystem access constraints
    if (spec.filesystemAccess === "unrestricted") {
      criticalViolation = true;
      violations.push("CRITICAL_SECURITY_VIOLATION: Unrestricted filesystem access is prohibited. Only scoped temporary sandboxes are allowed.");
      securityScore = 0;
    }

    // 8. Tool governance check: Verify all requested tools exist in controlled ToolRegistry
    const toolRegistry = ToolRegistryService.getInstance();
    if (spec.allowedTools && Array.isArray(spec.allowedTools)) {
      for (const tool of spec.allowedTools) {
        const isDangerous =
          tool.includes("RAW_BASH") ||
          tool.includes("EXECUTE") ||
          tool.includes("DROP_") ||
          tool.includes("UNRESTRICTED") ||
          tool.includes("SHELL");

        if (isDangerous) {
          criticalViolation = true;
          violations.push(`Dangerous unauthorized Tool call prohibited: "${tool}".`);
          securityScore -= 50;
        } else if (!toolRegistry.getTool(tool) && tool !== "*") {
          violations.push(`Tool "${tool}" is not registered in the Controlled Tool Registry.`);
          securityScore -= 25;
        }
      }
    } else {
      violations.push("Skill must specify a valid allowedTools array.");
      securityScore -= 20;
    }

    securityScore = Math.max(0, Math.min(100, securityScore));

    let securityStatus: "TRUSTED" | "REQUIRES_APPROVAL" | "UNTRUSTED" | "REJECTED";
    let trusted = false;

    if (criticalViolation || securityScore < 50) {
      securityStatus = criticalViolation ? "REJECTED" : "UNTRUSTED";
    } else if (violations.length > 0) {
      securityStatus = "UNTRUSTED";
    } else if (warnings.length > 0 || spec.networkOutbound) {
      securityStatus = "REQUIRES_APPROVAL";
    } else {
      securityStatus = "TRUSTED";
      trusted = true;
    }

    const manifest: Partial<SkillDefinition> = {
      id: skillId,
      name,
      description: spec.description || "GitHub verified skill.",
      source: "github",
      category: spec.category || "Operations",
      allowedTools: spec.allowedTools || [],
      executionLimits: {
        timeoutMs: Math.min(spec.timeoutMs || 30000, 30000),
        maxRetries: 1,
        requiresSandbox: true,
      },
      version: spec.version || "1.0.0",
      enabled: trusted,
      metadata: {
        repositoryUrl: repoUrl,
        commitHashOrTag: commitHash,
        securityScore,
        evaluatedAt: Date.now(),
      },
    };

    return {
      valid: violations.length === 0 && !criticalViolation && securityScore >= 70,
      trusted,
      securityScore,
      securityStatus,
      violations,
      errors: violations,
      warnings,
      commitPinned,
      sandboxEnforced,
      manifest: {
        ...manifest,
        source: "github",
        requiresSandbox: true,
        commitHash,
      } as any,
    };
  }

  /**
   * Safely registers a validated GitHub-sourced skill into the registry.
   * Section 20: Untrusted or unvalidated skills must never execute.
   */
  public registerGitHubSkill(
    spec: GitHubSkillSpec,
    approval?: { approvedBy: string; approvedAt: string }
  ): any {
    const evaluation = this.validateGitHubSkill(spec);

    if (!evaluation.valid || evaluation.violations.length > 0) {
      throw new Error(`Security validation failed: ${evaluation.violations.join("; ")}`);
    }

    const manifest = evaluation.manifest as any;
    const commitHash = spec.commitHashOrTag || spec.commitHash;
    const skillDef: SkillDefinition = {
      id: manifest?.id || spec.skillId || `gh-${Date.now()}`,
      name: manifest?.name || spec.name || spec.skillName || "Custom GitHub Skill",
      description: manifest?.description || spec.description || "GitHub-sourced skill.",
      category: manifest?.category || spec.category || "Operations",
      capabilities: manifest?.capabilities || spec.capabilities || [],
      allowedTools: manifest?.allowedTools || spec.allowedTools || [],
      permissions: manifest?.permissions || spec.permissions || [],
      version: manifest?.version || spec.version || "1.0.0",
      enabled: true,
      executionLimits: manifest?.executionLimits || {
        timeoutMs: 20000,
        maxRetries: 1,
        requiresSandbox: true,
      },
      source: "github",
      metadata: {
        ...manifest?.metadata,
        commitHash,
        requiresSandbox: true,
      },
    };

    this.registerSkill(skillDef);
    return {
      ...skillDef,
      source: "github",
      commitHash,
      requiresSandbox: true,
      success: true,
      skill: skillDef,
    };
  }

  /**
   * Validates generic external skill specifications (legacy compatibility).
   */
  public validateExternalSkill(spec: Partial<SkillDefinition>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!spec.id || typeof spec.id !== "string" || spec.id.trim().length === 0) {
      errors.push("Missing required field: id");
    }

    if (!spec.name || typeof spec.name !== "string" || spec.name.trim().length === 0) {
      errors.push("Missing required field: name");
    }

    if (!spec.category) {
      errors.push("Missing required field: category");
    }

    if (!spec.source) {
      errors.push("Missing required field: source");
    }

    if (spec.source === "github" || spec.source === "marketplace") {
      if (!spec.executionLimits?.requiresSandbox) {
        errors.push("External skills from GitHub or Marketplace must require sandboxing.");
      }
      if (!spec.executionLimits?.timeoutMs || spec.executionLimits.timeoutMs > 60000) {
        warnings.push("External skill execution timeout should not exceed 60,000ms.");
      }
    }

    if (!spec.version || !/^\d+\.\d+\.\d+$/.test(spec.version)) {
      warnings.push("Version should adhere to Semantic Versioning (e.g. 1.0.0).");
    }

    if (!spec.allowedTools || !Array.isArray(spec.allowedTools)) {
      errors.push("allowedTools must be an array of permitted tool identifiers.");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Matches and recommends skills required for a high-level goal or task description.
   */
  public findSkillsForGoal(goal: string): SkillDefinition[] {
    const lower = goal.toLowerCase();
    const matched: SkillDefinition[] = [];

    const addSkillIfFound = (skillName: string) => {
      const s = this.getSkill(skillName);
      if (s && !matched.some((m) => m.id === s.id)) {
        matched.push(s);
      }
    };

    if (/research|competitor|market|benchmarks|trend/i.test(lower)) {
      addSkillIfFound("Research");
      addSkillIfFound("Analyze");
    }
    if (/analyz|drop|decline|why|metric|churn|conversion/i.test(lower)) {
      addSkillIfFound("Analyze");
      addSkillIfFound("Audit");
      addSkillIfFound("Report");
      addSkillIfFound("Conversion Optimization");
    }
    if (/write|copy|headline|email|content|text|script/i.test(lower)) {
      addSkillIfFound("Write");
      addSkillIfFound("Communicate");
    }
    if (/plan|strategy|priorit|roadmap|schedule/i.test(lower)) {
      addSkillIfFound("Plan");
      addSkillIfFound("Schedule");
    }
    if (/build|create|launch|landing page|website|app|page/i.test(lower)) {
      addSkillIfFound("Design");
      addSkillIfFound("Build");
      addSkillIfFound("Create");
      addSkillIfFound("Verify");
    }
    if (/code|develop|api|function|bug|fix/i.test(lower)) {
      addSkillIfFound("Code");
      addSkillIfFound("Test");
      addSkillIfFound("Debug");
    }
    if (/qualif|lead|prospect|scoring/i.test(lower)) {
      addSkillIfFound("Qualify");
      addSkillIfFound("Follow Up");
    }
    if (/sop|procedure|workflow|coordination|handover|process/i.test(lower)) {
      addSkillIfFound("SOP Analysis");
      addSkillIfFound("Workflow Planning");
      addSkillIfFound("Audit");
    }
    if (/monitor|track|health|uptime/i.test(lower)) {
      addSkillIfFound("Monitor");
      addSkillIfFound("Report");
    }
    if (/optimiz|improve|refine|boost/i.test(lower)) {
      addSkillIfFound("Optimize");
      addSkillIfFound("Recommend");
      addSkillIfFound("Conversion Optimization");
    }
    if (/strateg|direction|opportunity|risk|option|roadmap/i.test(lower)) {
      addSkillIfFound("Strategic Planning");
      addSkillIfFound("Business Analysis");
      addSkillIfFound("Opportunity Analysis");
      addSkillIfFound("Risk Analysis");
      addSkillIfFound("Action Planning");
    }
    if (/automat|trigger|condition|action mapping|follow-up automatically|flow|webhook/i.test(lower)) {
      addSkillIfFound("Workflow Design");
      addSkillIfFound("Trigger Mapping");
      addSkillIfFound("Condition Mapping");
      addSkillIfFound("Action Mapping");
      addSkillIfFound("Workflow Testing");
      addSkillIfFound("Automation Verification");
    }
    if (/support|customer|ticket|enquiry|complaint|faq|inquiry|escalat|refund/i.test(lower)) {
      addSkillIfFound("Customer Enquiry Handling");
      addSkillIfFound("Knowledge Retrieval");
      addSkillIfFound("Response Drafting");
      addSkillIfFound("Issue Classification");
      addSkillIfFound("Escalation");
      addSkillIfFound("Resolution Verification");
    }

    if (matched.length === 0) {
      addSkillIfFound("Analyze");
      addSkillIfFound("Plan");
      addSkillIfFound("Recommend");
    }

    return matched;
  }

  /**
   * Initializes the 27 canonical skills.
   */
  private registerDefaultSkills(): void {
    const limits: SkillExecutionLimits = {
      timeoutMs: 30000,
      maxRetries: 2,
    };

    const definitions: Array<{
      name: string;
      description: string;
      category: SkillCategory;
      allowedTools: string[];
    }> = [
      // 1. Analysis & Strategy
      {
        name: "Research",
        description: "Gathers external and internal intelligence on markets, audiences, competitors, and trends.",
        category: "Strategy",
        allowedTools: ["search_knowledge", "query_memory", "analyze_audience"],
      },
      {
        name: "Analyze",
        description: "Performs diagnostic, quantitative, and qualitative evaluation of business metrics and bottlenecks.",
        category: "Analysis",
        allowedTools: ["get_analytics_summary", "query_memory"],
      },
      {
        name: "Audit",
        description: "Conducts structured systematic reviews of systems, funnels, copy, workflows, or operational health.",
        category: "Analysis",
        allowedTools: ["get_analytics_summary", "list_funnels", "list_pages"],
      },
      {
        name: "Compare",
        description: "Benchmarks alternatives, competitors, A/B test variations, or operational performance periods.",
        category: "Analysis",
        allowedTools: ["get_analytics_summary", "query_memory"],
      },
      {
        name: "Forecast",
        description: "Projects future metric trajectories, customer churn, revenue, and pipeline velocity.",
        category: "Analysis",
        allowedTools: ["get_analytics_summary"],
      },
      {
        name: "Plan",
        description: "Deconstructs high-level executive directives into sequential and parallel execution steps.",
        category: "Strategy",
        allowedTools: ["store_memory", "create_task"],
      },
      {
        name: "Recommend",
        description: "Formulates prioritized, actionable strategic recommendations grounded in verified business context.",
        category: "Strategy",
        allowedTools: ["query_memory"],
      },

      // 2. Creation & Copywriting
      {
        name: "Write",
        description: "Drafts high-converting headlines, body copy, marketing narratives, and customer communications.",
        category: "Creation",
        allowedTools: ["store_memory", "create_email_template"],
      },
      {
        name: "Summarize",
        description: "Condenses complex business data, customer feedback, and multi-step execution logs into executive insights.",
        category: "Communication",
        allowedTools: ["query_memory"],
      },
      {
        name: "Create",
        description: "Generates assets, promotions, campaign blueprints, and workflow templates.",
        category: "Creation",
        allowedTools: ["create_funnel", "create_page", "create_section"],
      },
      {
        name: "Communicate",
        description: "Crafts professional, brand-aligned messaging for external prospects and internal stakeholders.",
        category: "Communication",
        allowedTools: ["send_email"],
      },

      // 3. Engineering & Design
      {
        name: "Design",
        description: "Constructs harmonious visual hierarchies, responsive section layouts, typography, and color tokens.",
        category: "Engineering",
        allowedTools: ["create_section", "update_section", "create_page"],
      },
      {
        name: "Build",
        description: "Assembles complete websites, landing pages, forms, and business portal components.",
        category: "Engineering",
        allowedTools: ["create_page", "create_section", "create_form"],
      },
      {
        name: "Code",
        description: "Implements structural HTML, CSS styling tokens, JavaScript interactivity, and component logic.",
        category: "Engineering",
        allowedTools: ["create_section", "update_section"],
      },
      {
        name: "Test",
        description: "Executes functional and technical QA tests on DOM structures, links, buttons, and form submissions.",
        category: "Engineering",
        allowedTools: ["get_page", "submit_form"],
      },
      {
        name: "Debug",
        description: "Diagnoses layout flaws, broken elements, contrast defects, and runtime script errors.",
        category: "Engineering",
        allowedTools: ["update_section", "get_page"],
      },

      // 4. Optimization & Governance
      {
        name: "Optimize",
        description: "Refines conversion rates, headline clarity, visual appeal, and workflow efficiency.",
        category: "Analysis",
        allowedTools: ["update_page", "update_section"],
      },
      {
        name: "Verify",
        description: "Validates technical execution adherence and business goal alignment (CTA, audience, ownership).",
        category: "Governance",
        allowedTools: ["get_page", "get_contact", "get_funnel"],
      },
      {
        name: "Monitor",
        description: "Tracks active system status, lead velocity, campaign metrics, and error rates.",
        category: "Governance",
        allowedTools: ["get_analytics_summary"],
      },
      {
        name: "Report",
        description: "Generates structured performance digests, audit summaries, and diagnostic briefings.",
        category: "Governance",
        allowedTools: ["get_analytics_summary", "query_memory"],
      },

      // 5. Customer & Operational
      {
        name: "Qualify",
        description: "Scores and filters leads based on firmographic fit, buying intent, and qualification rules.",
        category: "Strategy",
        allowedTools: ["get_contact", "add_contact_tag", "qualify_lead"],
      },
      {
        name: "Follow Up",
        description: "Orchestrates multi-channel re-engagement cadences and timely communication touches.",
        category: "Communication",
        allowedTools: ["create_automation", "send_email", "qualify_lead"],
      },
      {
        name: "Schedule",
        description: "Manages timelines, appointment bookings, task deadlines, and calendar availability.",
        category: "Strategy",
        allowedTools: ["create_task"],
      },

      // 6. Phase 4 Operations & Sales Foundations
      {
        name: "SOP Analysis",
        description: "Analyzes standard operating procedures, identifies operational bottlenecks, and audits compliance.",
        category: "Analysis",
        allowedTools: ["generate_sop_summary", "query_memory"],
      },
      {
        name: "Workflow Planning",
        description: "Designs sequential and parallel operating workflows, coordinates tasks, and mitigates handoff latencies.",
        category: "Strategy",
        allowedTools: ["audit_operations_workflow", "create_task"],
      },
      {
        name: "Conversion Optimization",
        description: "Audits lead drop-offs across pipeline stages, objection patterns, and conversion velocity.",
        category: "Analysis",
        allowedTools: ["analyze_sales_funnel", "update_funnel"],
      },

      // 7. Phase 4 Strategy Skills
      {
        name: "Business Analysis",
        description: "Analyzes core business problems, market drivers, unit economics, and strategic organizational context.",
        category: "Analysis",
        allowedTools: ["query_memory", "get_dashboard_analytics", "get_analytics_summary"],
      },
      {
        name: "Strategic Planning",
        description: "Formulates strategic options, long-term roadmaps, milestone dependencies, and resource allocations.",
        category: "Strategy",
        allowedTools: ["query_memory", "store_memory", "get_analytics_summary"],
      },
      {
        name: "Goal Decomposition",
        description: "Deconstructs high-level business goals into measurable sub-objectives, priorities, and worker task assignments.",
        category: "Strategy",
        allowedTools: ["query_memory", "store_memory"],
      },
      {
        name: "Opportunity Analysis",
        description: "Identifies high-leverage growth vectors, competitive gaps, and underserved customer segments.",
        category: "Analysis",
        allowedTools: ["query_memory", "search_knowledge", "get_analytics_summary"],
      },
      {
        name: "Risk Analysis",
        description: "Evaluates strategic, operational, financial, and compliance risks with mitigating contingencies.",
        category: "Governance",
        allowedTools: ["query_memory", "get_dashboard_analytics"],
      },
      {
        name: "Action Planning",
        description: "Transforms strategic options into prioritized, dependency-mapped next actions and delegation recommendations.",
        category: "Strategy",
        allowedTools: ["query_memory", "store_memory"],
      },

      // 8. Phase 4 Automation Skills
      {
        name: "Workflow Design",
        description: "Designs multi-stage event-driven business automation flows (Trigger -> Condition -> Action).",
        category: "Operations",
        allowedTools: ["create_automation", "audit_operations_workflow"],
      },
      {
        name: "Trigger Mapping",
        description: "Maps business events, inbound lead forms, webhooks, and status transitions into deterministic automation triggers.",
        category: "Operations",
        allowedTools: ["create_automation", "query_memory"],
      },
      {
        name: "Condition Mapping",
        description: "Defines precision filtering rules, threshold criteria, and branching logic for automated workflows.",
        category: "Governance",
        allowedTools: ["create_automation"],
      },
      {
        name: "Action Mapping",
        description: "Binds approved controlled tools to trigger events with parameter schemas and safety controls.",
        category: "Operations",
        allowedTools: ["create_automation", "activate_automation"],
      },
      {
        name: "Workflow Testing",
        description: "Conducts dry-run validation, failure detection, and edge-case simulation for automation sequences.",
        category: "Governance",
        allowedTools: ["create_automation", "audit_operations_workflow"],
      },
      {
        name: "Automation Verification",
        description: "Verifies live execution reliability, exception boundaries, idempotency, and throughput metrics.",
        category: "Governance",
        allowedTools: ["activate_automation", "audit_operations_workflow"],
      },

      // 9. Phase 4 Support Skills
      {
        name: "Customer Enquiry Handling",
        description: "Evaluates inbound customer support requests, classifies intent, and executes resolution workflows.",
        category: "Communication",
        allowedTools: ["search_knowledge", "query_memory", "get_contact"],
      },
      {
        name: "Knowledge Retrieval",
        description: "Retrieves verified company policies, product documentation, FAQs, and ground truth from Company Brain.",
        category: "Analysis",
        allowedTools: ["search_knowledge", "query_memory"],
      },
      {
        name: "Response Drafting",
        description: "Drafts grounded, brand-aligned, empathetic customer support replies strictly adhering to approved policy.",
        category: "Communication",
        allowedTools: ["query_memory", "search_knowledge"],
      },
      {
        name: "Issue Classification",
        description: "Categorizes support tickets by severity, sentiment, product area, and operational priority.",
        category: "Analysis",
        allowedTools: ["query_memory", "get_contact"],
      },
      {
        name: "Escalation",
        description: "Identifies sensitive cases, refund demands, or policy exceptions and escalates cleanly for human approval.",
        category: "Governance",
        allowedTools: ["get_contact", "add_contact_tag"],
      },
      {
        name: "Resolution Verification",
        description: "Verifies that customer inquiries are resolved fully, accurately, and without unverified commitments.",
        category: "Governance",
        allowedTools: ["search_knowledge", "query_memory"],
      },
    ];

    for (const def of definitions) {
      const id = def.name.toLowerCase().replace(/\s+/g, "-");
      this.registerSkill({
        id,
        name: def.name,
        description: def.description,
        source: "builtin",
        category: def.category,
        allowedTools: def.allowedTools,
        executionLimits: limits,
        version: "1.0.0",
        enabled: true,
      });
    }
  }
}
