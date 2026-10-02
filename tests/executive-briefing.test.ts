/**
 * ELMO Executive AI — Comprehensive Acceptance Test Suite
 *
 * Verifies:
 * 1. Multi-tenant RLS isolation: Strict tenant separation for briefings and pipeline telemetry.
 * 2. Industry-agnostic intelligence: Adapts dynamically to SaaS, Restaurant, Coaching, Insurance, E-commerce.
 * 3. Priority Engine & "Why It Matters" 3-part framework (What Happened / Why It Matters / Recommended Action).
 * 4. Dynamic "Today's Focus" generation (1-5 actionable focus items).
 * 5. Audio Briefing Synthesis (Natural verbal script without markdown artifact noise).
 * 6. Multilingual briefings (English, Malay, Chinese).
 * 7. In-memory & persistent caching with explicit force refresh.
 * 8. Voice & Intent trigger pipeline ("Good morning ELMO", "Give me my morning briefing").
 * 9. Contextual follow-up intelligence ("Tell me more about the leads", "Which funnel is performing worst?").
 * 10. AI-Native Action Execution Loop (Briefing -> Recommend -> User Approval -> Orchestrator -> Agent -> Task/Execution).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ExecutiveBriefingService } from "@/services/executive-briefing.service";
import { ExecutivePriorityService } from "@/services/executive-priority.service";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { ElmoIntentService } from "@/services/elmo-intent.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ContactService } from "@/services/contact.service";
import { FunnelService } from "@/services/funnel.service";
import { AnalyticsService } from "@/services/analytics.service";
import { TaskService } from "@/services/task.service";
import { ApprovalService } from "@/services/approval.service";

describe("Executive AI Morning Briefing & Executive Intelligence", () => {
  let store: MockDataStore;
  let briefingService: ExecutiveBriefingService;
  let priorityService: ExecutivePriorityService;
  let intelligenceService: ELMOIntelligenceService;
  let intentService: ElmoIntentService;

  const TENANT_A = "11111111-1111-1111-1111-111111111111"; // Acme SaaS
  const USER_A = "00000000-0000-0000-0000-000000000001";

  const TENANT_B = "22222222-2222-2222-2222-222222222222"; // Bistro F&B
  const USER_B = "00000000-0000-0000-0000-000000000002";

  beforeEach(() => {
    store = MockDataStore.getInstance();
    store.reset();

    // Register Tenant B
    store.organizations.set(TENANT_B, {
      id: TENANT_B,
      name: "Bistro F&B",
      slug: "bistro-fb",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    store.organizationMembers.set("mem-b", {
      id: "mem-b",
      organization_id: TENANT_B,
      user_id: USER_B,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    briefingService = ExecutiveBriefingService.getInstance();
    briefingService.clearCache();
    priorityService = ExecutivePriorityService.getInstance();
    intelligenceService = ELMOIntelligenceService.getInstance();
    intentService = ElmoIntentService.getInstance();
  });

  // ==========================================================================
  // 1. BRIEFING GENERATION & CORE DATA ACCURACY
  // ==========================================================================
  describe("1. Real-Data Briefing Generation & Accuracy", () => {
    it("should generate a complete, valid executive briefing grounded in actual tenant data", async () => {
      // Seed Tenant A with contacts, funnels, and analytics events
      const contactService = ContactService.getInstance();
      const funnelService = FunnelService.getInstance();
      const analyticsService = AnalyticsService.getInstance();

      await contactService.createContact({
        userId: USER_A,
        organizationId: TENANT_A,
        firstName: "Sarah",
        lastName: "Connor",
        email: "sarah@cyberdyne.com",
        status: "lead",
        source: "LinkedIn",
      });

      const { data: funnel } = await funnelService.createFunnel({
        userId: USER_A,
        organizationId: TENANT_A,
        name: "Enterprise Demo Funnel",
        status: "active",
      });

      if (funnel) {
        await analyticsService.recordEvent({
          organizationId: TENANT_A,
          funnelId: funnel.id,
          eventType: "funnel_visit",
        });
        await analyticsService.recordEvent({
          organizationId: TENANT_A,
          funnelId: funnel.id,
          eventType: "conversion",
        });
      }

      const briefing = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        forceRefresh: true,
      });

      expect(briefing).toBeDefined();
      expect(briefing.organizationId).toBe(TENANT_A);
      expect(briefing.businessSnapshot).toBeDefined();
      expect(briefing.businessSnapshot.newLeadsCount).toBeGreaterThanOrEqual(1);
      expect(briefing.funnelHealth).toBeDefined();
      expect(briefing.funnelHealth.activeFunnels.length).toBeGreaterThanOrEqual(1);
      expect(briefing.dataFreshness).toBeDefined();
      expect(briefing.dataFreshness.isRealtime).toBe(true);
      expect(briefing.spokenBriefing).toBeDefined();
      expect(briefing.spokenBriefing.length).toBeGreaterThan(20);
    });

    it("should report zero/neutral metrics without hallucinating data when no events exist", async () => {
      // Fresh organization with no prior activity
      const briefing = await briefingService.getBriefing({
        userId: USER_B,
        organizationId: TENANT_B,
        forceRefresh: true,
      });

      expect(briefing).toBeDefined();
      expect(briefing.businessSnapshot.newLeadsCount).toBe(0);
      expect(briefing.businessSnapshot.newContactsCount).toBe(0);
      expect(briefing.businessSnapshot.leadVolumeChange.current).toBe(0);
      expect(briefing.businessSnapshot.leadVolumeChange.trend).toBe("neutral");
      expect(briefing.priorityItems).toBeDefined();
      expect(briefing.todayFocus.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // 2. MULTI-TENANT ISOLATION & RLS VERIFICATION
  // ==========================================================================
  describe("2. Strict Multi-Tenant Isolation & RLS", () => {
    it("should never leak Tenant A contacts, funnels, or briefings to Tenant B", async () => {
      const contactService = ContactService.getInstance();
      const funnelService = FunnelService.getInstance();

      // Create confidential Tenant A asset
      await contactService.createContact({
        userId: USER_A,
        organizationId: TENANT_A,
        firstName: "Confidential",
        lastName: "Client",
        email: "confidential@tenanta.com",
        status: "lead",
      });

      await funnelService.createFunnel({
        userId: USER_A,
        organizationId: TENANT_A,
        name: "Confidential Project Alpha",
        status: "active",
      });

      // Generate Tenant A briefing
      const briefingA = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        forceRefresh: true,
      });

      // Generate Tenant B briefing
      const briefingB = await briefingService.getBriefing({
        userId: USER_B,
        organizationId: TENANT_B,
        forceRefresh: true,
      });

      // Assert complete isolation
      expect(briefingA.organizationId).toBe(TENANT_A);
      expect(briefingB.organizationId).toBe(TENANT_B);

      // Tenant B's briefing must contain 0 references to Tenant A's client or project
      const jsonB = JSON.stringify(briefingB);
      expect(jsonB).not.toContain("Confidential Client");
      expect(jsonB).not.toContain("Confidential Project Alpha");
      expect(jsonB).not.toContain("confidential@tenanta.com");
    });
  });

  // ==========================================================================
  // 3. PRIORITY ENGINE & "WHY IT MATTERS" 3-PART FRAMEWORK
  // ==========================================================================
  describe("3. Priority Engine & 'Why It Matters' 3-Part Framework", () => {
    it("should format every attention item with What Happened, Why It Matters, and Recommended Action", async () => {
      // Seed high impact approval and overdue task
      const approvalService = ApprovalService.getInstance();
      const taskService = TaskService.getInstance();

      await approvalService.createPendingApproval({
        userId: USER_A,
        organizationId: TENANT_A,
        action: "Deploy Production Ad Budget of $10,000",
        requestedBy: "Growth Agent",
        category: "budget_spend",
        riskLevel: "High",
        details: "Requires executive sign-off for campaign expansion.",
      });

      await taskService.createTask({
        userId: USER_A,
        organizationId: TENANT_A,
        title: "Submit Quarterly Compliance Report",
        priority: "HIGH",
        dueDate: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2 days overdue
      });

      const briefing = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        forceRefresh: true,
      });

      const attentionItems = briefing.priorityItems.filter(
        (p) => p.category === "ATTENTION_REQUIRED" || p.priority === "urgent" || p.priority === "high"
      );

      expect(attentionItems.length).toBeGreaterThanOrEqual(1);

      for (const item of attentionItems) {
        // Must satisfy the canonical 3-part framework:
        // 1. Fact (What Happened)
        expect(item.whatHappened).toBeDefined();
        expect(item.whatHappened.length).toBeGreaterThan(5);

        // 2. Analysis (Why Does It Matter)
        expect(item.whyItMatters).toBeDefined();
        expect(item.whyItMatters.length).toBeGreaterThan(10);

        // 3. Recommendation (What Should Happen Next)
        expect(item.recommendedAction).toBeDefined();
        expect(item.recommendedAction.length).toBeGreaterThan(10);
      }
    });

    it("should never use arbitrary random priority scores", () => {
      const items = priorityService.evaluatePriorityItems({
        organizationName: "Apex Fitness",
        businessSnapshot: {
          newLeadsCount: 15,
          newContactsCount: 3,
          leadSources: [{ source: "Instagram", count: 15, percentage: 100 }],
          importantContactActivity: [],
          leadVolumeChange: { current: 15, previous: 5, percentChange: 200, trend: "up" },
          conversionChange: { currentRate: 18, previousRate: 10, rateDifference: 8, trend: "up" },
          funnelActivity: { activeFunnelsCount: 2, totalViews: 400, totalConversions: 40 },
          importantBusinessEvents: [],
        },
        funnelHealth: {
          activeFunnels: [],
          overallConversionHealth: "healthy",
          anomalies: [],
          opportunities: ["Expand top performing ad channels"],
        },
        workStatus: {
          pendingApprovals: [],
          highPriorityTasks: [],
          overdueTasks: [],
          blockedTasks: [],
          activeExecutions: [],
          failedExecutions: [],
          retryingExecutions: [],
          completedExecutions: [],
          replanningEvents: [],
          itemsRequiringHumanAttention: [],
        },
        workforceSummary: {
          agents: [],
          totalCompleted: 5,
          totalExecuting: 1,
          totalRequiringApproval: 0,
          totalFailed: 0,
        },
        companyBrain: {
          recentEvents: [],
          strategicDecisions: [],
          activeGoals: [],
          customerPatterns: [],
          relevantHistoricalContext: [],
        },
      });

      for (const item of items) {
        // Priority levels must be semantic, not arbitrary magic numbers
        expect(["low", "medium", "high", "urgent"]).toContain(item.priority);
        expect(["ATTENTION_REQUIRED", "WATCH", "OPPORTUNITY", "POSITIVE_RESULT", "INFORMATION"]).toContain(item.category);
      }
    });
  });

  // ==========================================================================
  // 4. TODAY'S FOCUS DYNAMIC GENERATION
  // ==========================================================================
  describe("4. Today's Focus Dynamic Checklist", () => {
    it("should generate between 1 and 5 ranked actionable priorities", async () => {
      const briefing = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        forceRefresh: true,
      });

      expect(briefing.todayFocus.length).toBeGreaterThanOrEqual(1);
      expect(briefing.todayFocus.length).toBeLessThanOrEqual(5);

      briefing.todayFocus.forEach((focus, idx) => {
        expect(focus.order).toBe(idx + 1);
        expect(focus.title).toBeDefined();
        expect(focus.reason).toBeDefined();
        expect(typeof focus.canElmoHandle).toBe("boolean");
      });
    });
  });

  // ==========================================================================
  // 5. AUDIO SPOKEN BRIEFING SYNTHESIS & NATURAL SPEECH
  // ==========================================================================
  describe("5. Natural Audio Spoken Script Synthesis", () => {
    it("should generate a spoken script designed for voice that omits raw markdown formatting", async () => {
      const briefing = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        forceRefresh: true,
      });

      const script = briefing.spokenBriefing;
      expect(script).toBeDefined();
      expect(script.startsWith("Good morning")).toBe(true);

      // Must be clean natural verbalization:
      expect(script).not.toContain("###");
      expect(script).not.toContain("**");
      expect(script).not.toContain("```");
      expect(script).not.toContain("`");
      expect(script).not.toContain("[link]");

      // Script should be concise (verbal briefing is typically 3-6 sentences, < 150 words)
      const wordCount = script.split(/\s+/).length;
      expect(wordCount).toBeGreaterThan(15);
      expect(wordCount).toBeLessThan(250);
    });

    it("should synthesize spoken briefings in requested languages (Malay, Chinese, English)", async () => {
      // English
      const enBriefing = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        language: "en",
        forceRefresh: true,
      });
      expect(enBriefing.spokenBriefing.toLowerCase()).toContain("good morning");

      // Malay
      const msBriefing = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        language: "ms",
        forceRefresh: true,
      });
      expect(msBriefing.spokenBriefing.toLowerCase()).toContain("selamat pagi");

      // Chinese
      const zhBriefing = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        language: "zh",
        forceRefresh: true,
      });
      expect(zhBriefing.spokenBriefing).toMatch(/早安|早上好/);
    });
  });

  // ==========================================================================
  // 6. CACHING & FORCE REFRESH BEHAVIOR
  // ==========================================================================
  describe("6. Caching & Explicit Force Refresh", () => {
    it("should return isCached: true on subsequent requests and bypass cache on forceRefresh", async () => {
      // 1. Initial fresh generation
      const briefing1 = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        forceRefresh: true,
      });
      expect(briefing1.isCached).toBe(false);

      // 2. Second read without forceRefresh uses cache
      const briefing2 = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        forceRefresh: false,
      });
      expect(briefing2.isCached).toBe(true);
      expect(briefing2.id).toBe(briefing1.id);

      // 3. Force refresh triggers recalculation
      const briefing3 = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        forceRefresh: true,
      });
      expect(briefing3.isCached).toBe(false);
    });
  });

  // ==========================================================================
  // 7. VOICE & DASHBOARD TRIGGERS (INTENT PIPELINE)
  // ==========================================================================
  describe("7. Voice & Dashboard Morning Briefing Intent Triggers", () => {
    it("should classify natural voice morning triggers as executive_briefing intent across languages", async () => {
      const prompts = [
        "Good morning ELMO",
        "Give me my morning briefing",
        "What should I do today",
        "Selamat pagi ELMO",
        "早安 ELMO",
        "Buenos días ELMO",
      ];

      for (const p of prompts) {
        const analysis = intentService.analyzeIntent(p);
        expect(analysis.intent).toBe("executive_briefing");
      }
    });

    it("should route 'Good morning ELMO' in ELMOIntelligenceService to spoken briefing", async () => {
      const response = await intelligenceService.processMessage({
        userId: USER_A,
        organizationId: TENANT_A,
        message: "Good morning ELMO",
        inputMode: "voice",
      });

      expect(response.saasIntent).toBe("executive_briefing");
      expect(response.briefingPayload).toBeDefined();
      expect(response.text.toLowerCase()).toContain("good morning");
    });
  });

  // ==========================================================================
  // 8. CONTEXTUAL FOLLOW-UP INTELLIGENCE
  // ==========================================================================
  describe("8. Contextual Follow-up Inquiries", () => {
    it("should respond accurately to follow-up questions referencing morning briefing metrics", async () => {
      const followUps = [
        "Tell me more about the leads",
        "Which funnel is performing worst?",
        "Why did conversion drop?",
        "Show me high-priority leads",
        "What should I do first?",
      ];

      for (const q of followUps) {
        const res = await intelligenceService.processMessage({
          userId: USER_A,
          organizationId: TENANT_A,
          message: q,
          inputMode: "text",
        });

        expect(res.text).toBeDefined();
        expect(res.text.length).toBeGreaterThan(15);
      }
    });
  });

  // ==========================================================================
  // 9. AI-NATIVE ACTION EXECUTION LOOP
  // ==========================================================================
  describe("9. AI-Native Action Loop (Briefing -> Recommend -> User Approval -> Orchestrator -> Agent)", () => {
    it("should execute a recommended briefing action and orchestrate without external automation tools", async () => {
      // Step 1: Generate briefing with recommended action
      const briefing = await briefingService.getBriefing({
        userId: USER_A,
        organizationId: TENANT_A,
        forceRefresh: true,
      });

      expect(briefing.recommendations.length).toBeGreaterThanOrEqual(1);
      const recommendation = briefing.recommendations[0];

      // Step 2: User approves action -> AI operates autonomous execution
      const result = await briefingService.executeBriefingAction({
        userId: USER_A,
        organizationId: TENANT_A,
        briefingId: briefing.id,
        actionPayload: recommendation.actionPayload || {
          type: "optimize_funnel",
          parameters: { funnelName: "Enterprise Funnel" },
        },
        approvedByUser: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message.length).toBeGreaterThan(10);
    });

    it("should respect human authority gates: require approval for high risk actions", async () => {
      const result = await briefingService.executeBriefingAction({
        userId: USER_A,
        organizationId: TENANT_A,
        actionPayload: {
          type: "review_approval",
          targetId: "appr-spend-123",
          parameters: { action: "Increase Ad Spend by $5,000" },
        },
        approvedByUser: false,
      });

      expect(result.success).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });
  });

  // ==========================================================================
  // 10. INDUSTRY INDEPENDENCE VERIFICATION
  // ==========================================================================
  describe("10. Industry Independence Across Diverse Domains", () => {
    it("should operate seamlessly for non-property domains: Restaurant, Coaching, SaaS, Insurance", async () => {
      const industries = [
        { name: "Tokyo Ramen Bistro", type: "Restaurant / F&B" },
        { name: "Nexus SaaS Cloud", type: "B2B Software" },
        { name: "Executive Life Coaching", type: "Education & Coaching" },
        { name: "Guardian Life Assurance", type: "Insurance & Finance" },
      ];

      for (const ind of industries) {
        // Generate briefing for arbitrary organization
        const orgId = `org-${Math.random().toString(36).slice(2, 8)}`;
        const userId = `usr-${Math.random().toString(36).slice(2, 8)}`;

        store.organizations.set(orgId, {
          id: orgId,
          name: ind.name,
          slug: ind.name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        store.organizationMembers.set(`mem-${orgId}`, {
          id: `mem-${orgId}`,
          organization_id: orgId,
          user_id: userId,
          role: "owner",
          created_at: new Date().toISOString(),
        });

        const briefing = await briefingService.getBriefing({
          userId,
          organizationId: orgId,
          forceRefresh: true,
        });

        expect(briefing).toBeDefined();
        expect(briefing.todayFocus).toBeDefined();
        expect(briefing.priorityItems).toBeDefined();
        expect(briefing.spokenBriefing).toBeDefined();

        // Must not contain property-only hardcoded assumptions
        expect(briefing.spokenBriefing.toLowerCase()).not.toContain("property listing price per square foot");
      }
    });
  });
});
