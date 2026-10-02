/**
 * ELMO Phase 2 — Company Brain & Business Context Service (CompanyBrainService)
 *
 * Implements the unified business intelligence layer for ELMO:
 * - Structured Business Profile across 7 dimensions (Identity, Products, Customers, Marketing, Sales, Operations, Goals)
 * - 100% Industry-Agnostic (Restaurant, Insurance, Coaching, SaaS, Ecommerce, Agency, Healthcare, Property, etc.)
 * - Dynamic Context Retrieval tailored to user request intent
 * - Strict Priority Hierarchy: Explicit Directive > Business Profile > Company Brain > Conversation > Verified Memory > AI Inference
 * - Business Learning Foundation: records verified campaign/conversion outcomes as structured lessons
 * - Strict Multi-Tenant Isolation: verifies organization membership before every access
 */

import { MockDataStore, CompanyMemoryRow } from "@/lib/supabase/mock-store";
import { ElmoMemoryService } from "./elmo-memory.service";
import {
  BusinessProfile,
  BusinessGoalItem,
  CompanyBrain,
  BusinessContextRequest,
  RelevantBusinessContext,
  VerifiedBusinessOutcome,
} from "@/types/company-brain.types";

export class CompanyBrainService {
  private static instance: CompanyBrainService;
  private store: MockDataStore;
  private memoryService: ElmoMemoryService;

  private constructor() {
    this.store = MockDataStore.getInstance();
    this.memoryService = ElmoMemoryService.getInstance();
  }

  public static getInstance(): CompanyBrainService {
    if (!CompanyBrainService.instance) {
      CompanyBrainService.instance = new CompanyBrainService();
    }
    return CompanyBrainService.instance;
  }

  public static resetInstance(): void {
    CompanyBrainService.instance = undefined as any;
  }

  // ==========================================================================
  // 1. Structured Business Profile Management
  // ==========================================================================

  /**
   * Retrieves the structured Business Profile for an organization.
   * If not explicitly configured in org settings, synthesizes a dynamic profile
   * from confirmed business memories.
   */
  public async getBusinessProfile(
    userId: string,
    organizationId: string
  ): Promise<BusinessProfile | null> {
    if (!this.store.isOrgMember(userId, organizationId)) {
      throw new Error("Unauthorized: User is not an authorized member of this organization.");
    }

    const org = this.store.organizations.get(organizationId);
    if (!org) return null;

    const settings = (org.settings || {}) as Record<string, unknown>;
    const savedProfile = settings.businessProfile as BusinessProfile | undefined;

    if (savedProfile) {
      return savedProfile;
    }

    // Synthesize initial profile from active company memories and org identity
    return this.synthesizeProfileFromMemories(organizationId, org.name);
  }

  /**
   * Updates the structured Business Profile for an organization.
   * Validates organization membership and commits updates to org settings.
   */
  public async updateBusinessProfile(
    userId: string,
    organizationId: string,
    updates: Partial<BusinessProfile>
  ): Promise<{ success: boolean; profile: BusinessProfile | null; error: string | null }> {
    if (!this.store.isOrgMember(userId, organizationId)) {
      throw new Error("Unauthorized: User is not an authorized member of this organization.");
    }

    const org = this.store.organizations.get(organizationId);
    if (!org) {
      return { success: false, profile: null, error: "Organization not found." };
    }

    let currentProfile: BusinessProfile | null = null;
    try {
      currentProfile = await this.getBusinessProfile(userId, organizationId);
    } catch {
      // fallback
    }

    if (!currentProfile) {
      currentProfile = {
        organizationId,
        businessName: org.name,
        companyName: org.name,
        industry: "General Business",
      };
    }

    const businessName = updates.companyName || updates.businessName || currentProfile.businessName || org.name;
    const merged: BusinessProfile = {
      ...currentProfile,
      ...updates,
      businessName,
      companyName: businessName,
      organizationId, // immutable
      updatedAt: new Date().toISOString(),
    };

    if (!merged.createdAt) {
      merged.createdAt = new Date().toISOString();
    }

    // Persist into organization settings
    const settings = (org.settings || {}) as Record<string, unknown>;
    settings.businessProfile = merged;
    org.settings = settings;
    org.updated_at = new Date().toISOString();

    // Also synchronize top-level facts into Company Memory if updated
    if (updates.businessName || updates.companyName || updates.industry || updates.targetAudience) {
      await this.memoryService.createMemory({
        userId,
        organizationId,
        title: "Updated Business Identity",
        content: `Business: "${merged.businessName}", Industry: "${merged.industry}"${
          merged.targetAudience ? `, Target Audience: "${typeof merged.targetAudience === "string" ? merged.targetAudience : JSON.stringify(merged.targetAudience)}"` : ""
        }.`,
        category: "business",
        entityType: "business_identity",
        importance: 5,
        confidenceLevel: "confirmed",
        source: "user_provided",
      });
    }

    return { success: true, profile: merged, error: null };
  }

  // ==========================================================================
  // 2. Complete Company Brain Compilation
  // ==========================================================================

  /**
   * Compiles the complete structured Company Brain for an organization:
   * Aggregates Business Profile + 8 memory categories + active rules + goals.
   */
  public async compileCompanyBrain(
    userId: string,
    organizationId: string
  ): Promise<CompanyBrain | null> {
    if (!this.store.isOrgMember(userId, organizationId)) {
      throw new Error("Unauthorized: User is not an authorized member of this organization.");
    }

    const profile = (await this.getBusinessProfile(userId, organizationId)) || {
      organizationId,
      businessName: "Enterprise",
      companyName: "Enterprise",
      industry: "General Business",
    };

    // Retrieve active memories across categories
    const allMemories = this.store.queryMemoriesWithRLS(
      userId,
      organizationId,
      undefined,
      100,
      { status: "active", includeExpired: false }
    );

    const verifiedMemories = allMemories.filter((m) => Number(m.confidence) >= 0.8);
    const businessRules = allMemories
      .filter((m) => m.category === "rule" || (m.category as string) === "rules")
      .map((m) => m.content);

    // Merge profile rules with memory rules
    if (profile.businessRules) {
      for (const r of profile.businessRules) {
        if (!businessRules.includes(r)) businessRules.push(r);
      }
    }

    const activeGoals: BusinessGoalItem[] = allMemories
      .filter((m) => m.category === "goal" || (m.category as string) === "goals")
      .map((m) => ({
        id: m.id,
        title: m.content,
        category: "business" as const,
        priority: (Number(m.importance_score) >= 4 ? "high" : "normal") as "high" | "normal",
      }));

    if (profile.goals && Array.isArray(profile.goals)) {
      for (const g of profile.goals) {
        if (!activeGoals.some((ag) => ag.title === g.title)) activeGoals.push(g);
      }
    }

    const recentDecisions = allMemories
      .filter((m) => m.category === "decision" || (m.category as string) === "decisions")
      .slice(0, 5)
      .map((m) => ({ id: m.id, decision: m.content, date: m.created_at }));

    const lessonsLearned = allMemories
      .filter((m) => m.category === "lesson" || (m.category as string) === "lessons" || m.category === "learning")
      .slice(0, 5)
      .map((m) => ({
        id: m.id,
        lesson: m.content,
        metric: (m.metadata as Record<string, unknown>)?.outcomeMetric as string | undefined,
        date: m.created_at,
      }));

    const summaryParts: string[] = [
      `Business: ${profile.companyName || profile.businessName} (${profile.industry})`,
      profile.description ? `Description: ${profile.description}` : "",
      profile.targetAudience ? `Target Audience: ${typeof profile.targetAudience === "string" ? profile.targetAudience : JSON.stringify(profile.targetAudience)}` : "",
      profile.brandVoice ? `Brand Voice: ${typeof profile.brandVoice === "string" ? profile.brandVoice : JSON.stringify(profile.brandVoice)}` : "",
      businessRules.length > 0 ? `Rules: ${businessRules.slice(0, 3).join("; ")}` : "",
      activeGoals.length > 0 ? `Active Goals: ${activeGoals.slice(0, 2).map((g) => g.title).join("; ")}` : "",
    ].filter(Boolean);

    const identity = {
      companyName: profile.companyName || profile.businessName || "Enterprise",
      industry: profile.industry || "General Business",
      tagline: profile.tagline,
      description: profile.description,
    };

    const productsServices = profile.productsServices || profile.products || [];
    const targetAudience = profile.targetAudience || {};
    const marketingBrandVoice = profile.brandVoice || profile.marketing || {};
    const salesProcess = profile.salesProcess || profile.sales || {};
    const operationalRules = profile.operationalRules || profile.operations || {};
    const goalsPriorities =
      profile.goals && !Array.isArray(profile.goals)
        ? { primaryGoal: profile.goals.primaryQGoal || profile.goals.primaryGoal || "", keyMetrics: profile.goals.keyMetrics || [] }
        : { primaryGoal: profile.goals?.[0]?.title || activeGoals[0]?.title || "", keyMetrics: [] };

    const recentDecisionStrings = recentDecisions.map((d) => d.decision);
    const recentLessonStrings = lessonsLearned.map((l) => l.lesson);

    return {
      organizationId,
      profile,
      verifiedMemories,
      activeGoals,
      businessRules,
      activeRules: businessRules,
      recentDecisions: recentDecisionStrings as any,
      lessonsLearned,
      recentLessons: recentLessonStrings,
      compiledSummary: summaryParts.join(" | "),

      identity,
      productsServices,
      targetAudience,
      marketingBrandVoice,
      salesProcess,
      operationalRules,
      goalsPriorities,
    };
  }

  // ==========================================================================
  // 3. Dynamic Business Context Retrieval (Request-Tailored)
  // ==========================================================================

  /**
   * Dynamically selects and injects relevant business context for the user's specific request.
   * Enforces the Strict Priority Hierarchy:
   * Explicit User Directive > Current Business Profile > Company Brain > Current Conversation > Verified Memory > AI Inference
   */
  public async retrieveRelevantBusinessContext(
    params: BusinessContextRequest
  ): Promise<RelevantBusinessContext> {
    const defaultRes: RelevantBusinessContext = {
      organizationId: params.organizationId,
      businessName: "Enterprise",
      industry: "General Business",
      sourceOfIndustry: "fallback",
      memoriesInjected: [],
      formattedContextString: "",
    };

    if (!this.store.isOrgMember(params.userId, params.organizationId)) {
      return defaultRes;
    }

    let profile: BusinessProfile | null = null;
    try {
      profile = await this.getBusinessProfile(params.userId, params.organizationId);
    } catch {
      // fallback
    }

    if (!profile) {
      profile = {
        organizationId: params.organizationId,
        businessName: "Enterprise",
        companyName: "Enterprise",
        industry: "General Business",
      };
    }

    // 1. Determine Industry & Topic with Strict Priority
    let finalIndustry = profile.industry || "General Business";
    let sourceOfIndustry: RelevantBusinessContext["sourceOfIndustry"] = "business_profile";

    if (params.explicitOverrides?.industry) {
      finalIndustry = params.explicitOverrides.industry;
      sourceOfIndustry = "explicit_override";
    }

    // 2. Determine Audience with Strict Priority
    let finalAudience = profile.targetAudience;
    if (params.explicitOverrides?.targetAudience) {
      finalAudience = params.explicitOverrides.targetAudience;
    }

    // 3. Determine Core Offer with Strict Priority
    let finalOffer = profile.offers?.[0]?.name;
    if (params.explicitOverrides?.offer) {
      finalOffer = params.explicitOverrides.offer;
    }

    // 4. Dynamic Context Selection based on Request Intent
    const lowerText = params.requestText.toLowerCase();
    const intent = (params.intent || "").toLowerCase();

    // Query relevant memories based on the specific inquiry
    const memoriesInjected = await this.memoryService.getRelevantMemoriesForContext(
      params.userId,
      params.organizationId,
      params.requestText,
      6
    );

    // Extract relevant rules, goals, and lessons
    const relevantRules: string[] = [];
    if (profile.businessRules) relevantRules.push(...profile.businessRules);

    const relevantGoals: string[] = [];
    if (profile.goals) {
      if (Array.isArray(profile.goals)) {
        relevantGoals.push(...profile.goals.map((g: any) => g.title || String(g)));
      } else if (typeof profile.goals === "object") {
        if (profile.goals.primaryQGoal) relevantGoals.push(profile.goals.primaryQGoal);
        if (profile.goals.primaryGoal) relevantGoals.push(profile.goals.primaryGoal);
        if (Array.isArray(profile.goals.keyMetrics)) relevantGoals.push(...profile.goals.keyMetrics);
      }
    }

    const relevantLessons: string[] = [];
    for (const mem of memoriesInjected) {
      if (mem.category === "rule" || (mem.category as string) === "rules") {
        if (!relevantRules.includes(mem.content)) relevantRules.push(mem.content);
      } else if (mem.category === "goal" || (mem.category as string) === "goals") {
        if (!relevantGoals.includes(mem.content)) relevantGoals.push(mem.content);
      } else if (mem.category === "lesson" || (mem.category as string) === "lessons" || mem.category === "learning") {
        if (!relevantLessons.includes(mem.content)) relevantLessons.push(mem.content);
      }
    }

    // Build key products/services list
    const keyProductsServices: string[] = [];
    const prods = profile.productsServices || profile.products || [];
    for (const p of prods) {
      if (typeof p === "string") keyProductsServices.push(p);
      else if (p?.name) keyProductsServices.push(p.name + (p.pricing ? ` (${p.pricing})` : ""));
    }

    const activeRules: string[] = [...relevantRules];
    const activeGoals: string[] = [...relevantGoals];

    // Build tailored formatted context string
    const contextLines: string[] = [
      `### COMPANY BRAIN & BUSINESS CONTEXT`,
      `- **Business**: ${profile.companyName || profile.businessName}`,
      `- **Industry**: ${finalIndustry}${
        sourceOfIndustry === "explicit_override"
          ? " (EXPLICIT USER OVERRIDE IN EFFECT: Directive overrides default profile)"
          : ""
      }`,
    ];

    if (sourceOfIndustry === "explicit_override") {
      contextLines.push(
        `- **OVERRIDE NOTE**: EXPLICIT USER OVERRIDE IN EFFECT for ${finalIndustry}. Reason strictly according to this directive.`
      );
    }

    if (finalAudience) {
      contextLines.push(`- **Target Audience / ICP**: ${typeof finalAudience === "string" ? finalAudience : (finalAudience.primarySegment || JSON.stringify(finalAudience))}`);
    }
    if (finalOffer) {
      contextLines.push(`- **Core Offer**: ${finalOffer}`);
    }
    if (profile.brandVoice) {
      contextLines.push(`- **Brand Voice**: ${typeof profile.brandVoice === "string" ? profile.brandVoice : JSON.stringify(profile.brandVoice)}`);
    }
    if (profile.marketing?.positioning) {
      contextLines.push(`- **Market Positioning**: ${profile.marketing.positioning}`);
    }

    // Intent-Specific contextual sections
    const isMarketingOrLanding =
      intent.includes("landing") ||
      intent.includes("marketing") ||
      intent.includes("copy") ||
      /(landing page|headline|copy|offer|campaign|hero|cta|brand|ppc)/i.test(lowerText);

    if (isMarketingOrLanding) {
      contextLines.push(`\n#### BRAND VOICE & MARKETING STRATEGY`);
      contextLines.push(`- **Brand Voice**: ${typeof profile.brandVoice === "string" ? profile.brandVoice : JSON.stringify(profile.brandVoice || "Professional & Authoritative")}`);
      contextLines.push(`#### TARGET CUSTOMERS`);
      contextLines.push(`- **Target Audience**: ${typeof finalAudience === "string" ? finalAudience : (finalAudience?.primarySegment || JSON.stringify(finalAudience || "Target Market"))}`);
      if (keyProductsServices.length > 0) {
        contextLines.push(`- **Core Offerings**: ${keyProductsServices.join(", ")}`);
      }
    }

    const isSalesOrConversion =
      intent.includes("sales") ||
      intent.includes("analytics") ||
      intent.includes("business_analysis") ||
      /(sales|leads|converting|conversion|drop|friction|closing|deal)/i.test(lowerText);

    if (isSalesOrConversion) {
      contextLines.push(`\n#### SALES & CONVERSION PROCESS`);
      contextLines.push(`- **Sales Process**: ${typeof profile.salesProcess === "string" ? profile.salesProcess : JSON.stringify(profile.salesProcess || profile.sales || "Consultative Sales")}`);
      contextLines.push(`#### STRATEGIC GOALS & PRIORITIES`);
      contextLines.push(`- **Active Strategic Goals**: ${activeGoals.join("; ")}`);
    }

    const isOperationsOrWorkflow =
      intent.includes("automation") ||
      intent.includes("task") ||
      /(workflow|process|policy|sop|rule|responsibility|adjustment|budget|refund|hours)/i.test(lowerText);

    if (isOperationsOrWorkflow) {
      contextLines.push(`\n#### OPERATIONAL RULES & CONSTRAINTS`);
      contextLines.push(`- **Operational Rules**: ${activeRules.join("; ")}`);
      if (profile.operationalRules) {
        contextLines.push(`- **Operating Guidelines**: ${typeof profile.operationalRules === "string" ? profile.operationalRules : JSON.stringify(profile.operationalRules)}`);
      }
    }

    if (relevantRules.length > 0 && !isOperationsOrWorkflow) {
      contextLines.push(`- **Operational Rules & Constraints**: ${relevantRules.slice(0, 3).join("; ")}`);
    }

    if (relevantGoals.length > 0 && !isSalesOrConversion) {
      contextLines.push(`- **Active Strategic Goals**: ${relevantGoals.slice(0, 2).join("; ")}`);
    }

    if (relevantLessons.length > 0) {
      contextLines.push(`- **Verified Historical Lessons**: ${relevantLessons.slice(0, 2).join("; ")}`);
    }

    return {
      organizationId: params.organizationId,
      businessName: profile.companyName || profile.businessName || "Enterprise",
      industry: finalIndustry,
      activeIndustry: finalIndustry,
      sourceOfIndustry,
      targetAudience: typeof finalAudience === "string" ? finalAudience : (finalAudience?.primarySegment || JSON.stringify(finalAudience)),
      coreOffer: finalOffer,
      positioning: profile.marketing?.positioning,
      brandVoice: typeof profile.brandVoice === "string" ? profile.brandVoice : JSON.stringify(profile.brandVoice),
      relevantRules,
      activeRules,
      relevantGoals,
      activeGoals,
      relevantLessons,
      keyProductsServices,
      operationalConstraints: activeRules,
      relevantSalesProcess: profile.sales?.salesProcessOverview,
      industrySpecificData: profile.industrySpecificContext,
      memoriesInjected,
      formattedContextString: contextLines.join("\n"),
    };
  }

  // ==========================================================================
  // 4. Business Learning Foundation
  // ==========================================================================

  /**
   * Records a verified business outcome as a structured lesson memory.
   * Prepares the system for Phase 3: Execute -> Verify -> Learn -> Improve.
   */
  public async recordVerifiedOutcome(
    userOrOutcome: string | VerifiedBusinessOutcome,
    orgId?: string,
    outcomeData?: any
  ): Promise<{ success: boolean; memory: CompanyMemoryRow | null; lessonMemoryId?: string; error: string | null }> {
    let userId: string;
    let organizationId: string;
    let outcome: any;

    if (typeof userOrOutcome === "string") {
      userId = userOrOutcome;
      organizationId = orgId!;
      outcome = outcomeData;
    } else {
      userId = userOrOutcome.verifiedByUserId;
      organizationId = userOrOutcome.organizationId;
      outcome = userOrOutcome;
    }

    if (!this.store.isOrgMember(userId, organizationId)) {
      throw new Error("Unauthorized: User is not authorized to record outcomes.");
    }

    const activityName = outcome.initiative || outcome.activityName || "Strategic Initiative";
    const activityType = outcome.activityType || "campaign";
    const keyFinding = outcome.learnings || outcome.keyFinding || "Documented business learning.";
    const metricName = outcome.metricName || outcome.outcomeMetric || "Metric";
    const metricValue = outcome.newValue || outcome.metricValue || "Verified";

    const content = `Lesson Learned from ${activityType} "${activityName}": ${keyFinding}. Metric: ${metricName} = ${metricValue}${
      outcome.previousValue ? ` (Previous: ${outcome.previousValue})` : ""
    }${outcome.conversionRate !== undefined ? ` (Conversion: ${outcome.conversionRate}%)` : ""}.`;

    const res = await this.memoryService.createMemory({
      userId,
      organizationId,
      title: `Verified Outcome: ${activityName}`,
      content,
      category: "lesson",
      entityType: "business_learning",
      importance: "high",
      confidenceLevel: "confirmed",
      source: "system_derived",
      metadata: {
        activityName,
        keyFinding,
        metricName,
        metricValue,
      },
    });

    const memoryRow = res.data || res;
    return {
      success: !!memoryRow,
      memory: memoryRow,
      lessonMemoryId: memoryRow?.id,
      error: res.error,
    };
  }

  // ==========================================================================
  // Helper: Profile Synthesis
  // ==========================================================================

  private synthesizeProfileFromMemories(organizationId: string, orgName: string): BusinessProfile {
    const profile: BusinessProfile = {
      organizationId,
      businessName: orgName,
      industry: "General Business",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const memories = Array.from(this.store.memories.values()).filter(
      (m) => m.organization_id === organizationId && m.status === "active"
    );

    for (const mem of memories) {
      const lower = mem.content.toLowerCase();
      if (mem.entity_type === "audience" || lower.includes("target audience")) {
        profile.targetAudience = mem.content.replace(/^target audience:?\s*/i, "").trim();
      } else if (mem.entity_type === "core_offer" || lower.includes("core offer")) {
        profile.offers = [
          {
            name: mem.content.replace(/^core offer:?\s*/i, "").trim(),
            type: "core_offer",
          },
        ];
      } else if (mem.category === "preference" && lower.includes("tone")) {
        profile.brandVoice = mem.content;
      }
    }

    return profile;
  }
}
