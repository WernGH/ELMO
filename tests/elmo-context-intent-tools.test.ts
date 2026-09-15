/**
 * ELMO Phase 1 — ELMO Intelligence, Context, Intent & Tool Boundary Tests
 *
 * Verifies:
 * 1. ElmoContextService: targeted context assembly, minimal token footprint, zero whole-DB dumps.
 * 2. ElmoIntentService: semantic classification, entity extraction, distinguishing chat from multi-step tasks.
 * 3. ElmoToolService: safe execution boundary, application service mediation, rejection of unknown tools.
 * 4. Visual State Integration: canonical EXECUTING state across ElmoCore and ELMORobotBust.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ElmoContextService } from "@/services/elmo-context.service";
import { ElmoIntentService } from "@/services/elmo-intent.service";
import { ElmoToolService } from "@/services/elmo-tool.service";
import { FunnelService } from "@/services/funnel.service";
import { PageService } from "@/services/page.service";
import { CORE_STATE_METADATA } from "@/components/elmo/ElmoCore";
import { ROBOT_BUST_STATES } from "@/components/ui/ELMORobotBust";

describe("ELMO Phase 1: Context, Intent & Tool Services Integration", () => {
  const store = MockDataStore.getInstance();
  const contextService = ElmoContextService.getInstance();
  const intentService = ElmoIntentService.getInstance();
  const toolService = ElmoToolService.getInstance();
  const funnelService = FunnelService.getInstance();
  const pageService = PageService.getInstance();

  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    store.reset();
  });

  // ==========================================================================
  // 1. ELMO Context Service (ElmoContextService)
  // ==========================================================================
  describe("ElmoContextService (Targeted Context Assembly)", () => {
    it("assembles minimal targeted context for user and organization", async () => {
      const context = await contextService.assembleContext({
        userId,
        organizationId: orgId,
      });

      expect(context.user.id).toBe(userId);
      expect(context.organization.id).toBe(orgId);
      expect(context.currentFunnel).toBeUndefined();
      expect(context.currentPage).toBeUndefined();
      expect(context.systemInstruction).toContain("ELMO");
      expect(context.systemInstruction).toContain("all-in-one funnel and marketing automation SaaS");
      expect(context.tokenEstimate).toBeGreaterThan(50);
      expect(context.tokenEstimate).toBeLessThan(1500);
    });

    it("attaches precise funnel slice without dumping other organization data", async () => {
      // Create Funnel 1
      const f1Res = await funnelService.createFunnel({
        userId,
        organizationId: orgId,
        name: "SaaS Launch Funnel",
        funnelType: "SaaS",
        goal: "Sign up 500 trial users",
        targetAudience: "B2B Tech Founders",
        offer: "14-day Pro Trial",
        primaryConversionGoal: "Trial Signup",
      });
      const f1Id = f1Res.data!.id;

      // Add steps
      await funnelService.createFunnelStep({
        userId,
        organizationId: orgId,
        funnelId: f1Id,
        name: "Landing Page",
        stepType: "landing",
      });
      await funnelService.createFunnelStep({
        userId,
        organizationId: orgId,
        funnelId: f1Id,
        name: "Onboarding Questionnaire",
        stepType: "survey",
      });

      // Create Funnel 2 (should NOT appear in f1's context)
      await funnelService.createFunnel({
        userId,
        organizationId: orgId,
        name: "Unrelated Secret Funnel",
        funnelType: "Product",
      });

      const context = await contextService.assembleContext({
        userId,
        organizationId: orgId,
        funnelId: f1Id,
      });

      expect(context.currentFunnel).toBeDefined();
      expect(context.currentFunnel?.name).toBe("SaaS Launch Funnel");
      expect(context.currentFunnel?.stepCount).toBe(2);
      expect(context.currentFunnel?.steps[0].name).toBe("Landing Page");
      expect(context.currentFunnel?.goal).toBe("Sign up 500 trial users");

      // Verify no leakage of Funnel 2 in systemInstruction or context
      expect(context.systemInstruction).not.toContain("Unrelated Secret Funnel");
    });

    it("attaches page and structured section summaries when pageId is provided", async () => {
      const pageRes = await pageService.createPage({
        userId,
        organizationId: orgId,
        name: "Optin Hero Page",
        slug: "optin",
        pageType: "opt-in",
      });
      const pageId = pageRes.data!.id;

      await pageService.createSection({
        userId,
        organizationId: orgId,
        pageId,
        sectionType: "hero",
        content: { headline: "Scale Faster With ELMO" },
      });
      await pageService.createSection({
        userId,
        organizationId: orgId,
        pageId,
        sectionType: "benefits",
        content: { items: ["Fast", "Autonomous", "Multilingual"] },
      });

      const context = await contextService.assembleContext({
        userId,
        organizationId: orgId,
        pageId,
      });

      expect(context.currentPage).toBeDefined();
      expect(context.currentPage?.name).toBe("Optin Hero Page");
      expect(context.currentPage?.sectionCount).toBe(2);
      expect(context.currentPage?.sectionTypes).toEqual(["hero", "benefits"]);
    });

    it("bounds recent conversation messages to limit", async () => {
      // Create conversation
      const conv = store.createConversation({
        organization_id: orgId,
        title: "Funnel Chat",
        created_by: userId,
      });
      for (let i = 0; i < 30; i++) {
        store.createMessage({
          organization_id: orgId,
          conversation_id: conv.id,
          role: i % 2 === 0 ? "user" : "assistant",
          content: `Message ${i}`,
        });
      }

      const context = await contextService.assembleContext({
        userId,
        organizationId: orgId,
        conversationId: conv.id,
        recentMessagesLimit: 5,
      });

      expect(context.recentMessages.length).toBe(5);
      expect(context.recentMessages[4].content).toBe("Message 29");
    });
  });

  // ==========================================================================
  // 2. ELMO Intent Service (ElmoIntentService)
  // ==========================================================================
  describe("ElmoIntentService (Semantic Intent Recognition)", () => {
    it("recognizes greetings in multiple languages as non-actionable chat", () => {
      const resEn = intentService.analyzeIntent("Hello ELMO!");
      expect(resEn.intent).toBe("greeting");
      expect(resEn.isComplexTask).toBe(false);
      expect(resEn.requiresAction).toBe(false);

      const resMy = intentService.analyzeIntent("Salam ELMO, selamat pagi");
      expect(resMy.intent).toBe("greeting");
      expect(resMy.isComplexTask).toBe(false);
      expect(resMy.requiresAction).toBe(false);
    });

    it("recognizes conceptual questions without triggering execution", () => {
      const res = intentService.analyzeIntent("What is a tripwire funnel and how does it work?");
      expect(res.intent).toBe("question");
      expect(res.isComplexTask).toBe(false);
      expect(res.requiresAction).toBe(false);
      expect(res.suggestedTools.length).toBe(0);
    });

    it("classifies funnel creation requests as complex actionable tasks", () => {
      const res = intentService.analyzeIntent(
        "Build a high-converting webinar funnel targeting b2b real estate investors"
      );
      expect(res.intent).toBe("funnel_creation");
      expect(res.isComplexTask).toBe(true);
      expect(res.requiresAction).toBe(true);
      expect(res.entities.funnelType).toBe("Webinar");
      expect(res.entities.targetAudience).toBe("b2b real estate investors");
      expect(res.suggestedTools).toContain("create_funnel");
    });

    it("identifies page creation and copywriting requests correctly", () => {
      const pageRes = intentService.analyzeIntent("Create a new sales page for our product");
      expect(pageRes.intent).toBe("page_creation");
      expect(pageRes.entities.pageType).toBe("sales");
      expect(pageRes.requiresAction).toBe(true);

      const copyRes = intentService.analyzeIntent("Write high-converting headline copy for high ticket coaching");
      expect(copyRes.intent).toBe("copywriting");
      expect(copyRes.suggestedTools).toContain("generate_copy");
    });

    it("identifies analytics and reporting requests", () => {
      const res = intentService.analyzeIntent("Show me the funnel conversion rate and analytics report");
      expect(res.intent).toBe("analytics_request");
      expect(res.suggestedTools).toContain("get_funnel_stats");
    });
  });

  // ==========================================================================
  // 3. ELMO Tool Service (ElmoToolService)
  // ==========================================================================
  describe("ElmoToolService (Safe Execution Boundary)", () => {
    it("exposes all defined tool schemas for Gemini function calling", () => {
      const tools = toolService.getAvailableTools();
      expect(tools.length).toBeGreaterThanOrEqual(8);
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("create_funnel");
      expect(toolNames).toContain("get_funnel");
      expect(toolNames).toContain("list_funnels");
      expect(toolNames).toContain("create_page");
      expect(toolNames).toContain("create_section");
      expect(toolNames).toContain("create_form");
      expect(toolNames).toContain("create_contact");
      expect(toolNames).toContain("create_email_sequence");
      expect(toolNames).toContain("get_funnel_stats");
    });

    it("executes create_funnel safely through domain service and updates visual state", async () => {
      const result = await toolService.executeTool(
        "create_funnel",
        {
          name: "High Ticket Mastermind Funnel",
          funnelType: "Coaching",
          goal: "Book 30 strategy calls/month",
          targetAudience: "7-figure Agency Owners",
          offer: "$10k Accelerator",
          primaryConversionGoal: "Booked Call",
        },
        { userId, organizationId: orgId }
      );

      expect(result.success).toBe(true);
      expect(result.visualState).toBe("SUCCESS");
      const funnelData = result.data as any;
      expect(funnelData.name).toBe("High Ticket Mastermind Funnel");
      expect(funnelData.funnel_type).toBe("Coaching");

      // Verify in store
      const inStore = store.funnels.get(funnelData.id);
      expect(inStore).toBeDefined();
      expect(inStore?.goal).toBe("Book 30 strategy calls/month");
    });

    it("executes create_page and create_section through tool gateway", async () => {
      const fRes = await toolService.executeTool(
        "create_funnel",
        { name: "Demo Funnel" },
        { userId, organizationId: orgId }
      );
      const funnelId = (fRes.data as any).id;

      const pageRes = await toolService.executeTool(
        "create_page",
        {
          funnelId,
          name: "Landing V1",
          slug: "landing-v1",
          pageType: "landing",
        },
        { userId, organizationId: orgId }
      );
      expect(pageRes.success).toBe(true);
      const pageId = (pageRes.data as any).id;

      const secRes = await toolService.executeTool(
        "create_section",
        {
          pageId,
          sectionType: "pricing",
          content: {
            tiers: [{ name: "Standard", price: 99 }, { name: "VIP", price: 299 }],
          },
        },
        { userId, organizationId: orgId }
      );
      expect(secRes.success).toBe(true);
      expect((secRes.data as any).section_type).toBe("pricing");
    });

    it("executes create_contact through tool gateway", async () => {
      const res = await toolService.executeTool(
        "create_contact",
        {
          email: "investor@venturecapital.com",
          firstName: "Marcus",
          lastName: "Vance",
          tags: ["vip", "investor"],
        },
        { userId, organizationId: orgId }
      );

      expect(res.success).toBe(true);
      const contact = res.data as any;
      expect(contact.email).toBe("investor@venturecapital.com");
      expect(contact.first_name).toBe("Marcus");
    });

    it("rejects unknown tools safely with ERROR visual state without throwing unhandled exceptions", async () => {
      const res = await toolService.executeTool(
        "drop_database_table",
        { table: "users" },
        { userId, organizationId: orgId }
      );

      expect(res.success).toBe(false);
      expect(res.visualState).toBe("ERROR");
      expect(res.error).toContain("Unknown tool");
    });
  });

  // ==========================================================================
  // 4. Visual State Integration (EXECUTING State)
  // ==========================================================================
  describe("Visual State Integration: EXECUTING State", () => {
    it("defines canonical EXECUTING metadata in ElmoCore", () => {
      const executingMeta = CORE_STATE_METADATA.EXECUTING;
      expect(executingMeta).toBeDefined();
      expect(executingMeta.label).toBe("EXECUTING");
      expect(executingMeta.subtext).toContain("Executing SaaS operational action");
      expect(executingMeta.glowColor).toContain("16, 185, 129");
      expect(executingMeta.statusBadge).toContain("emerald");
    });

    it("defines canonical EXECUTING state in ELMORobotBust", () => {
      const bustState = ROBOT_BUST_STATES.EXECUTING;
      expect(bustState).toBeDefined();
      expect(bustState.label).toBe("EXECUTING");
      expect(bustState.subtext).toBe("Performing funnel operation");
      expect(bustState.color).toBe("text-emerald-400");
      expect(bustState.symbol).toBe("⚡");
    });
  });
});
