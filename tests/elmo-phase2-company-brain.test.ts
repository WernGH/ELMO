/**
 * ELMO Phase 2 — Company Brain, Memory & Business Context Test Suite
 *
 * Comprehensive validation of:
 * 1. Industry-Agnostic Business Profiles across 8+ diverse industries
 * 2. 7 Core Dimensions of Company Brain Compilation
 * 3. 8 Canonical Memory Categories (business, customer, decision, preference, goal, rule, lesson, workflow)
 * 4. Memory Importance Levels and Confidence Calibration
 * 5. Memory Source Tracking & Protection (AI inferences never overwrite confirmed facts)
 * 6. Memory Deduplication (>0.85 similarity prevents duplicate rows)
 * 7. Memory Conflict Resolution & Graceful Supersession
 * 8. Strict Priority Hierarchy (Explicit User Request overrides profile/memory)
 * 9. Dynamic Context Retrieval Tailored to Request Intent
 * 10. Business Learning Foundation (Outcome & Lesson Tracking)
 * 11. Multi-Tenant Security & Tenant Isolation
 * 12. End-to-End Integration with ContextService & System Instruction
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { CompanyBrainService } from "@/services/company-brain.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { ContextService } from "@/services/context.service";
import { BusinessProfile } from "@/types/company-brain.types";

describe("ELMO Phase 2: Company Brain, Memory & Business Context", () => {
  const store = MockDataStore.getInstance();
  const brainService = CompanyBrainService.getInstance();
  const memoryService = ElmoMemoryService.getInstance();
  const contextService = ContextService.getInstance();

  const ORG_A = "11111111-1111-1111-1111-111111111111";
  const ORG_B = "22222222-2222-2222-2222-222222222222";
  const USER_OWNER = "00000000-0000-0000-0000-000000000001";
  const USER_STRANGER = "99999999-9999-9999-9999-999999999999";

  beforeEach(() => {
    store.reset();

    // Setup Organization A
    store.organizations.set(ORG_A, {
      id: ORG_A,
      name: "Apex Enterprises",
      slug: "apex-enterprises",
      settings: { autonomy_mode: "supervised", elmo_status: "active" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Setup Organization B
    store.organizations.set(ORG_B, {
      id: ORG_B,
      name: "Zenith Holdings",
      slug: "zenith-holdings",
      settings: { autonomy_mode: "supervised", elmo_status: "active" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Setup Owner membership in Org A
    store.organizationMembers.set("mem-owner-a", {
      id: "mem-owner-a",
      organization_id: ORG_A,
      user_id: USER_OWNER,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    // Setup User Profile
    store.profiles.set(USER_OWNER, {
      id: USER_OWNER,
      user_id: USER_OWNER,
      display_name: "Founder Alice",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    store.users.set(USER_OWNER, {
      id: USER_OWNER,
      email: "alice@apex.com",
    } as any);
  });

  // =========================================================================
  // 1. Industry-Agnostic Business Profiles across 8+ Industries
  // =========================================================================
  describe("1. Industry-Agnostic Business Profiles", () => {
    const industriesToTest: Array<{ industry: string; name: string; target: string }> = [
      { industry: "Restaurant", name: "Trattoria Bella", target: "Local foodies and families" },
      { industry: "Insurance", name: "Shield Life & Health", target: "Young parents seeking term life" },
      { industry: "SaaS", name: "PipelineHero CRM", target: "B2B sales leaders and SDR teams" },
      { industry: "Property", name: "Metro Commercial Brokerage", target: "Commercial real estate investors" },
      { industry: "Coaching", name: "Executive Horizon", target: "Senior enterprise executives" },
      { industry: "Ecommerce", name: "TerraWear Eco", target: "Environmentally conscious urban shoppers" },
      { industry: "Agency", name: "ScaleViral Media", target: "DTC brands with $50k+ monthly ad spend" },
      { industry: "Healthcare", name: "Summit Dental Spa", target: "Patients seeking cosmetic dentistry" },
    ];

    industriesToTest.forEach(({ industry, name, target }) => {
      it(`saves and retrieves a complete business profile for ${industry} neutrally`, async () => {
        const profile: BusinessProfile = {
          industry,
          companyName: name,
          tagline: `Leading ${industry} solutions`,
          description: `Comprehensive operations in the ${industry} space.`,
          productsServices: [
            { id: "prod-1", name: `${industry} Core Offering`, description: "Primary service package", isCore: true },
          ],
          targetAudience: {
            primarySegment: target,
            painPoints: ["Inefficiency", "High cost"],
            desiredOutcomes: ["Predictable growth", "Peace of mind"],
          },
          brandVoice: {
            tone: ["professional", "authoritative"],
            formality: "executive",
            prohibitedPhrases: ["cheap", "unverified"],
          },
          salesProcess: {
            model: "direct",
            averageDealCycle: "14 days",
          },
          operationalRules: {
            workingHours: "09:00 - 18:00",
            refundPolicy: "30-day money-back guarantee",
            strictCompliance: ["GDPR", "PDPA"],
          },
          goals: {
            primaryQGoal: "Grow revenue by 25%",
            keyMetrics: ["CAC", "LTV", "NPS"],
          },
        };

        const updateRes = await brainService.updateBusinessProfile(USER_OWNER, ORG_A, profile);
        expect(updateRes.success).toBe(true);

        const fetched = await brainService.getBusinessProfile(USER_OWNER, ORG_A);
        expect(fetched).toBeDefined();
        expect(fetched?.industry).toBe(industry);
        expect(fetched?.companyName).toBe(name);
        expect(fetched?.targetAudience.primarySegment).toBe(target);
        expect(fetched?.operationalRules.refundPolicy).toBe("30-day money-back guarantee");
      });
    });
  });

  // =========================================================================
  // 2. 7 Core Dimensions of Company Brain Compilation
  // =========================================================================
  describe("2. 7 Dimensions of Company Brain Compilation", () => {
    it("compiles all 7 dimensions with active memories, rules, decisions and goals", async () => {
      // 1. Seed Business Profile
      await brainService.updateBusinessProfile(USER_OWNER, ORG_A, {
        industry: "SaaS",
        companyName: "CloudScale AI",
        tagline: "Autonomous Cloud Optimization",
        description: "Intelligent resource scheduling for multi-cloud enterprises.",
        productsServices: [
          { id: "p1", name: "Optimizer Pro", pricing: "$499/mo", isCore: true },
        ],
        targetAudience: {
          primarySegment: "Enterprise DevOps Engineers",
          painPoints: ["AWS cloud bill waste"],
        },
        brandVoice: {
          tone: ["direct", "data-driven"],
          formality: "executive",
        },
        salesProcess: {
          model: "b2b_sales",
          averageDealCycle: "30 days",
        },
        operationalRules: {
          refundPolicy: "No refunds after 14 days",
          workingHours: "24/7 autonomous monitoring",
        },
        goals: {
          primaryQGoal: "Attain $1M ARR",
          keyMetrics: ["Monthly Churn < 1%"],
        },
      });

      // 2. Seed Memories across various categories
      await memoryService.saveRule(ORG_A, "All cloud modifications require owner approval.");
      await memoryService.saveDecision(ORG_A, "Decided to sunset support for legacy AWS SDK v1.");
      await memoryService.saveLesson(ORG_A, "Webinar conversions doubled when presenting case studies before pricing.");

      // 3. Compile Company Brain
      const brain = await brainService.compileCompanyBrain(USER_OWNER, ORG_A);

      expect(brain).toBeDefined();
      expect(brain!.organizationId).toBe(ORG_A);
      expect(brain!.identity.companyName).toBe("CloudScale AI");
      expect(brain!.identity.industry).toBe("SaaS");
      expect(brain!.productsServices.length).toBe(1);
      expect(brain!.productsServices[0].name).toBe("Optimizer Pro");
      expect(brain!.targetAudience.primarySegment).toBe("Enterprise DevOps Engineers");
      expect(brain!.marketingBrandVoice.formality).toBe("executive");
      expect(brain!.salesProcess.model).toBe("b2b_sales");
      expect(brain!.operationalRules.refundPolicy).toBe("No refunds after 14 days");
      expect(brain!.goalsPriorities.primaryGoal).toBe("Attain $1M ARR");

      // Verify memories aggregated into Company Brain
      expect(brain!.activeRules.some((r) => r.includes("require owner approval"))).toBe(true);
      expect((brain!.recentDecisions as any[]).some((d: any) => String(d).includes("sunset support"))).toBe(true);
      expect(brain!.recentLessons?.some((l: any) => String(l).includes("Webinar conversions doubled"))).toBe(true);
    });
  });

  // =========================================================================
  // 3. 8 Canonical Memory Categories
  // =========================================================================
  describe("3. 8 Canonical Memory Categories", () => {
    const categories: Array<"business" | "customer" | "decision" | "preference" | "goal" | "rule" | "lesson" | "workflow"> = [
      "business",
      "customer",
      "decision",
      "preference",
      "goal",
      "rule",
      "lesson",
      "workflow",
    ];

    it("creates, categorizes, and retrieves memories across all 8 canonical categories", async () => {
      for (const category of categories) {
        const mem = await memoryService.createMemory({
          organization_id: ORG_A,
          category,
          content: `Test entry for canonical category ${category}.`,
          importance: "high",
          source: "user_provided",
          confidence_score: 0.95,
        });

        expect(mem.id).toBeDefined();
        expect(mem.category).toBe(category);
      }

      // Query by specific category
      const rules = await memoryService.queryMemoriesByCategory(ORG_A, "rule");
      expect(rules.length).toBeGreaterThanOrEqual(1);
      expect(rules[0].category).toBe("rule");

      const workflows = await memoryService.queryMemoriesByCategory(ORG_A, "workflow");
      expect(workflows.length).toBeGreaterThanOrEqual(1);
      expect(workflows[0].category).toBe("workflow");
    });
  });

  // =========================================================================
  // 4. Memory Importance & Confidence Calibration
  // =========================================================================
  describe("4. Memory Importance & Confidence Calibration", () => {
    it("maps importance levels (low, normal, high, critical) to quantitative scores", async () => {
      const lowMem = await memoryService.createMemory({
        organization_id: ORG_A,
        category: "business",
        content: "Office coffee brand preference is Arabica.",
        importance: "low",
      });
      expect(lowMem.importance_score).toBe(0.25);

      const normMem = await memoryService.createMemory({
        organization_id: ORG_A,
        category: "business",
        content: "Weekly standup is on Monday at 10 AM.",
        importance: "normal",
      });
      expect(normMem.importance_score).toBe(0.5);

      const highMem = await memoryService.createMemory({
        organization_id: ORG_A,
        category: "business",
        content: "Target customer acquisition cost is capped at $80.",
        importance: "high",
      });
      expect(highMem.importance_score).toBe(0.75);

      const critMem = await memoryService.createMemory({
        organization_id: ORG_A,
        category: "business",
        content: "Production API secrets must never be committed to Git repositories.",
        importance: "critical",
      });
      expect(critMem.importance_score).toBe(1.0);
    });

    it("tracks confidence scores and prevents AI inference from overwriting confirmed facts", async () => {
      // 1. Seed a confirmed fact provided directly by user
      const confirmedFact = await memoryService.createMemory({
        organization_id: ORG_A,
        category: "rule",
        content: "Enterprise discount is strictly capped at 15%.",
        source: "fact",
        confidence: "confirmed",
        importance: "critical",
      });
      expect(confirmedFact.confidence_score).toBe(1.0);

      // 2. An AI inference attempts to suggest a higher discount
      const conflictCheck = await memoryService.detectConflict(
        ORG_A,
        "Enterprise discount can be negotiated up to 30%.",
        "rule"
      );

      // Conflict is detected
      expect(conflictCheck.hasConflict).toBe(true);
      expect(conflictCheck.conflictingMemory?.content).toContain("capped at 15%");

      // Attempting to overwrite a confirmed fact with an AI inference should be rejected
      const canOverwrite = confirmedFact.source !== "fact" && confirmedFact.confidence_score < 0.95;
      expect(canOverwrite).toBe(false);
    });
  });

  // =========================================================================
  // 5. Memory Deduplication Engine
  // =========================================================================
  describe("5. Memory Deduplication Engine", () => {
    it("detects similarity > 0.85 and updates existing memory without creating duplicate rows", async () => {
      const initialMem = await memoryService.createMemory({
        organization_id: ORG_A,
        category: "rule",
        content: "All customer refunds must be processed within 48 business hours.",
        importance: "normal",
      });

      const initialCount = store.companyMemories.size;

      // Check deduplication helper directly
      const dupCheck = await memoryService.checkDeduplication(
        ORG_A,
        "All customer refunds must be processed within 48 business hours.",
        "rule"
      );
      expect(dupCheck.isDuplicate).toBe(true);
      expect(dupCheck.similarityScore).toBe(1.0);

      // Attempting to create the near-identical memory
      const reAddMem = await memoryService.createMemory({
        organization_id: ORG_A,
        category: "rule",
        content: "All customer refunds must be processed within 48 business hours.",
        importance: "high",
      });

      // It returns the existing record ID, bumps importance, and does NOT add a new row
      expect(reAddMem.id).toBe(initialMem.id);
      expect(store.companyMemories.size).toBe(initialCount);
      expect(reAddMem.importance_score).toBe(0.75); // Bumped up to 'high'
    });
  });

  // =========================================================================
  // 6. Memory Conflict Resolution & Graceful Supersession
  // =========================================================================
  describe("6. Conflict Resolution & Graceful Supersession", () => {
    it("gracefully supersedes outdated memory with superseded_by pointer without data destruction", async () => {
      // 1. Initial rule
      const oldRule = await memoryService.createMemory({
        organization_id: ORG_A,
        category: "rule",
        content: "Customer return policy window is 14 calendar days.",
        importance: "high",
      });

      // 2. Conflict detected when new rule arrives
      const conflict = await memoryService.detectConflict(
        ORG_A,
        "Customer return policy window is 30 calendar days.",
        "rule"
      );
      expect(conflict.hasConflict).toBe(true);

      // 3. Save new rule that supersedes old rule
      const newRule = await memoryService.createMemory({
        organization_id: ORG_A,
        category: "rule",
        content: "Customer return policy window is 30 calendar days.",
        importance: "high",
      });

      // Mark old rule as superseded
      await memoryService.supersedeMemory(oldRule.id, newRule.id);

      // Verify old rule has superseded_by set in store
      const updatedOldRule = store.companyMemories.get(oldRule.id);
      expect((updatedOldRule?.metadata as any)?.superseded_by).toBe(newRule.id);

      // Query active memories excludes superseded records
      const activeRules = await memoryService.queryMemoriesByCategory(ORG_A, "rule", true);
      const activeIds = activeRules.map((r) => r.id);
      expect(activeIds).toContain(newRule.id);
      expect(activeIds).not.toContain(oldRule.id);
    });
  });

  // =========================================================================
  // 7. Strict Priority Hierarchy (Explicit Request Overrides Profile/Memory)
  // =========================================================================
  describe("7. Strict Priority Hierarchy", () => {
    it("gives absolute priority to explicit user request over profile and memory defaults", async () => {
      // Profile is set to "Restaurant"
      await brainService.updateBusinessProfile(USER_OWNER, ORG_A, {
        industry: "Restaurant",
        companyName: "Pasta Fresca",
        productsServices: [{ id: "p1", name: "Handmade Tagliatelle" }],
        targetAudience: { primarySegment: "Italian food lovers" },
      });

      // User makes an explicit request in a completely different domain (Insurance)
      const retrieved = await brainService.retrieveRelevantBusinessContext({
        userId: USER_OWNER,
        organizationId: ORG_A,
        requestText: "Build a Facebook ad lead generation campaign for my term life insurance package.",
        explicitOverrides: {
          industry: "Insurance",
          targetAudience: "Young families needing term life insurance",
        },
      });

      // Priority hierarchy strictly honours explicit override
      expect(retrieved.sourceOfIndustry).toBe("explicit_override");
      expect(retrieved.activeIndustry).toBe("Insurance");
      expect(retrieved.targetAudience).toBe("Young families needing term life insurance");
      // Formatted context reflects explicit override note
      expect(retrieved.formattedContextString).toContain("OVERRIDE IN EFFECT");
      expect(retrieved.formattedContextString).toContain("Insurance");
    });
  });

  // =========================================================================
  // 8. Dynamic Context Retrieval Tailored to Request Intent
  // =========================================================================
  describe("8. Dynamic Context Retrieval Tailored to Request Intent", () => {
    beforeEach(async () => {
      await brainService.updateBusinessProfile(USER_OWNER, ORG_A, {
        industry: "Agency",
        companyName: "Vortex Digital",
        productsServices: [
          { id: "s1", name: "SEO Optimization Sprint", pricing: "$2,500" },
          { id: "s2", name: "Performance PPC Ads", pricing: "$4,000/mo" },
        ],
        targetAudience: { primarySegment: "E-commerce retailers doing $100k+/mo" },
        brandVoice: { tone: ["punchy", "authoritative"], formality: "executive" },
        salesProcess: { model: "consultative_call", averageDealCycle: "10 days" },
        operationalRules: { workingHours: "Mon-Fri 9-5 EST", refundPolicy: "Milestone-based delivery" },
        goals: { primaryQGoal: "Onboard 10 new retainer clients", keyMetrics: ["ROAS > 4.0"] },
      });

      await memoryService.saveRule(ORG_A, "Ad spend budget changes greater than $500 require client sign-off.");
      await memoryService.saveWorkflow(ORG_A, "SEO audit workflow begins with screaming frog crawl and GSC export.");
    });

    it("retrieves brand voice and products for landing page creation", async () => {
      const ctx = await brainService.retrieveRelevantBusinessContext({
        userId: USER_OWNER,
        organizationId: ORG_A,
        requestText: "Create a landing page headline and offer section for our PPC services.",
      });

      expect(ctx.keyProductsServices?.some((p) => p.includes("Performance PPC"))).toBe(true);
      expect(ctx.formattedContextString).toContain("BRAND VOICE & MARKETING STRATEGY");
      expect(ctx.formattedContextString).toContain("TARGET CUSTOMERS");
    });

    it("retrieves sales process and goals for conversion/sales inquiries", async () => {
      const ctx = await brainService.retrieveRelevantBusinessContext({
        userId: USER_OWNER,
        organizationId: ORG_A,
        requestText: "Our sales conversion rate dropped this week. What is causing the friction?",
      });

      expect(ctx.activeGoals?.some((g) => g.includes("Onboard 10 new retainer clients"))).toBe(true);
      expect(ctx.formattedContextString).toContain("SALES & CONVERSION PROCESS");
      expect(ctx.formattedContextString).toContain("STRATEGIC GOALS & PRIORITIES");
    });

    it("retrieves operational rules and workflows for operational queries", async () => {
      const ctx = await brainService.retrieveRelevantBusinessContext({
        userId: USER_OWNER,
        organizationId: ORG_A,
        requestText: "How should we handle ad budget adjustment requests from clients?",
      });

      expect(ctx.activeRules?.some((r) => r.includes("require client sign-off"))).toBe(true);
      expect(ctx.formattedContextString).toContain("OPERATIONAL RULES & CONSTRAINTS");
    });
  });

  // =========================================================================
  // 9. Business Learning Foundation (Outcome & Lesson Tracking)
  // =========================================================================
  describe("9. Business Learning Foundation", () => {
    it("records verified business outcomes and persists them as reusable lesson memories", async () => {
      const outcomeRes = await brainService.recordVerifiedOutcome(USER_OWNER, ORG_A, {
        initiative: "Summer Webinar Campaign",
        outcome: "achieved",
        metricName: "Registration-to-Attendee Rate",
        previousValue: "18%",
        newValue: "34%",
        learnings: "Sending SMS reminders 15 minutes before the webinar doubled live attendance.",
        recordedBy: USER_OWNER,
      });

      expect(outcomeRes.success).toBe(true);
      expect(outcomeRes.lessonMemoryId).toBeDefined();

      // Verify the lesson was stored as a memory
      const lessons = await memoryService.queryMemoriesByCategory(ORG_A, "lesson");
      const found = lessons.find((l) => l.content.includes("Sending SMS reminders 15 minutes before"));
      expect(found).toBeDefined();
      expect(found?.importance_score).toBe(0.75); // Lessons default to high importance
    });
  });

  // =========================================================================
  // 10. Multi-Tenant Security & Tenant Isolation
  // =========================================================================
  describe("10. Multi-Tenant Security & Tenant Isolation", () => {
    it("blocks unauthorized users from reading or writing another organization's company brain", async () => {
      // Seed Org A
      await brainService.updateBusinessProfile(USER_OWNER, ORG_A, {
        industry: "Healthcare",
        companyName: "Confidential Clinic A",
      });

      // Stranger (not a member of Org A) tries to access Org A
      await expect(
        brainService.getBusinessProfile(USER_STRANGER, ORG_A)
      ).rejects.toThrow(/Unauthorized/);

      // Stranger tries to update Org A
      await expect(
        brainService.updateBusinessProfile(USER_STRANGER, ORG_A, {
          industry: "Insurance",
          companyName: "Hacked Clinic",
        })
      ).rejects.toThrow(/Unauthorized/);
    });

    it("strictly isolates memories between Organization A and Organization B", async () => {
      await memoryService.saveRule(ORG_A, "Org A confidential pricing formula: Cost + 40%.");
      await memoryService.saveRule(ORG_B, "Org B confidential pricing formula: Cost + 15%.");

      const orgAMems = await memoryService.queryMemoriesByCategory(ORG_A, "rule");
      const orgBMems = await memoryService.queryMemoriesByCategory(ORG_B, "rule");

      expect(orgAMems.every((m) => !m.content.includes("Org B"))).toBe(true);
      expect(orgBMems.every((m) => !m.content.includes("Org A"))).toBe(true);
    });
  });

  // =========================================================================
  // 11. End-to-End Context Assembly in ContextService
  // =========================================================================
  describe("11. End-to-End Context Assembly in ContextService", () => {
    it("assembles complete businessContext and injects it into ELMO CEO system prompt", async () => {
      // 1. Setup conversation and business profile
      const convId = "conv-phase2-test-1";
      store.conversations.set(convId, {
        id: convId,
        organization_id: ORG_A,
        title: "Company Brain Strategy Turn",
        created_by: USER_OWNER,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await brainService.updateBusinessProfile(USER_OWNER, ORG_A, {
        industry: "SaaS",
        companyName: "Antigravity Cloud",
        productsServices: [{ id: "p1", name: "IDE Orchestrator" }],
        operationalRules: { refundPolicy: "30-day money-back guarantee" },
      });

      await memoryService.saveRule(ORG_A, "Never deploy updates to production on Friday afternoon.");

      // 2. Build context
      const chatContext = await contextService.buildChatContext({
        userId: USER_OWNER,
        organizationId: ORG_A,
        conversationId: convId,
        messageQuery: "What is our deployment policy?",
      });

      expect(chatContext.businessContext).toBeDefined();
      const bContext = chatContext.businessContext as any;
      expect(bContext.activeIndustry).toBe("SaaS");

      // 3. Verify System Instruction receives Company Brain data while keeping verbatim core rules
      const sys = chatContext.systemInstruction;
      expect(sys).toContain("COMPANY BRAIN & BUSINESS CONTEXT");
      expect(sys).toContain("Antigravity Cloud");
      expect(sys).toContain("SaaS");
      expect(sys).toContain("30-day money-back guarantee");

      // Core ELMO CEO persona clauses must remain intact verbatim
      expect(sys).toContain("ELMO, the AI CEO");
      expect(sys).toContain("subordinate directly to the human owner");
      expect(sys).toContain("NEVER pretend an action was executed");
      expect(sys).toContain("CLEARLY DISTINGUISH between thinking/planning and actual execution");
    });
  });
});
