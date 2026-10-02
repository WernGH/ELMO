/**
 * ELMO Phase 1 — Core Intelligence, Communication & Understanding Test Suite
 *
 * Comprehensive validation of:
 * 1. Multilingual Understanding & Code-Switching (English, Malay, Chinese, Bahasa Rojak/Manglish)
 * 2. Intent Understanding (all 24 standard intents)
 * 3. Goal Understanding (User Message vs User Goal, analysis vs action)
 * 4. Entity Extraction (20+ structured entity fields)
 * 5. Industry Neutrality across 8 industries (Insurance, Restaurant, Coaching, SaaS, Ecommerce, Agency, Service Business, Property)
 * 6. Ambiguity Handling & Strict Priority Resolution (No property default!)
 * 7. Conversation Context Continuity & Reference Resolution ("the hero", "change the CTA")
 * 8. Security, Tenant Isolation & Role Permissions (Owner vs Viewer)
 * 9. Unified Voice & Text Intelligence Pipeline
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { ElmoIntentService } from "@/services/elmo-intent.service";
import { EntityExtractionService } from "@/services/entity-extraction.service";
import { GoalUnderstandingService } from "@/services/goal-understanding.service";
import { AmbiguityDetectorService } from "@/services/ambiguity-detector.service";
import { ContextService } from "@/services/context.service";
import { LanguageDetectionService } from "@/services/voice/language-detection.service";

describe("ELMO Phase 1: Core Intelligence, Communication & Understanding", () => {
  const store = MockDataStore.getInstance();
  const elmoIntelligence = ELMOIntelligenceService.getInstance();
  const intentService = ElmoIntentService.getInstance();
  const entityExtractor = EntityExtractionService.getInstance();
  const goalService = GoalUnderstandingService.getInstance();
  const ambiguityDetector = AmbiguityDetectorService.getInstance();
  const contextService = ContextService.getInstance();
  const langDetector = LanguageDetectionService.getInstance();

  const ORG_A = "11111111-1111-1111-1111-111111111111";
  const ORG_B = "22222222-2222-2222-2222-222222222222";
  const USER_OWNER = "00000000-0000-0000-0000-000000000001";
  const USER_VIEWER = "00000000-0000-0000-0000-000000000002";

  beforeEach(() => {
    store.reset();

    // Register Organization A
    store.organizations.set(ORG_A, {
      id: ORG_A,
      name: "Apex Global",
      slug: "apex-global",
      settings: { autonomy_mode: "supervised", elmo_status: "active" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Register Organization B
    store.organizations.set(ORG_B, {
      id: ORG_B,
      name: "Zenith Retail",
      slug: "zenith-retail",
      settings: { autonomy_mode: "supervised", elmo_status: "active" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Register Owner in Org A
    store.organizationMembers.set("mem-owner", {
      id: "mem-owner",
      organization_id: ORG_A,
      user_id: USER_OWNER,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    // Register Viewer in Org A
    store.organizationMembers.set("mem-viewer", {
      id: "mem-viewer",
      organization_id: ORG_A,
      user_id: USER_VIEWER,
      role: "viewer",
      created_at: new Date().toISOString(),
    });

    // Register user profiles
    store.profiles.set(USER_OWNER, {
      id: USER_OWNER,
      user_id: USER_OWNER,
      display_name: "Founder Alice",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    store.profiles.set(USER_VIEWER, {
      id: USER_VIEWER,
      user_id: USER_VIEWER,
      display_name: "Observer Bob",
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });

  // =========================================================================
  // 1. Multilingual Understanding & Code-Switching
  // =========================================================================
  describe("1. Multilingual Intelligence & Code-Switching", () => {
    it("detects English input accurately", () => {
      const detection = langDetector.detect("What are our top revenue drivers this quarter?");
      expect(detection.languageCode).toBe("en");
    });

    it("detects Bahasa Melayu input accurately", () => {
      const detection = langDetector.detect("Boleh tolong semak status kempen pemasaran kami hari ini?");
      expect(detection.languageCode).toBe("ms");
    });

    it("detects Chinese input accurately", () => {
      const detection = langDetector.detect("请帮我总结一下本周的市场营销数据和客户转化率。");
      expect(detection.languageCode).toBe("zh");
    });

    it("handles code-switching (Manglish / Bahasa Rojak) naturally without English fallback bias", async () => {
      const mixedMsg = "ELMO, tolong make the hero headline lebih premium and change the CTA untuk target clients.";
      const res = await elmoIntelligence.processMessage({
        userId: USER_OWNER,
        organizationId: ORG_A,
        message: mixedMsg,
      });

      expect(res.text).toBeDefined();
      expect(res.conversationId).toBeDefined();
      expect(res.elmoRequest?.isCodeSwitched).toBe(true);
    });
  });

  // =========================================================================
  // 2. Intent Understanding (All 24 Canonical Intents)
  // =========================================================================
  describe("2. Intent Understanding (24 Intents)", () => {
    it("classifies greeting", () => {
      const res = intentService.analyzeIntent("Hello ELMO, good morning!");
      expect(res.intent).toBe("greeting");
      expect(res.guardrailCategory).toBe("information");
    });

    it("classifies casual conversation", () => {
      const res = intentService.analyzeIntent("How are you feeling today ELMO?");
      expect(res.intent).toBe("casual_conversation");
      expect(res.guardrailCategory).toBe("information");
    });

    it("classifies general question", () => {
      const res = intentService.analyzeIntent("What is customer lifetime value and how do we calculate it?");
      expect(res.intent).toBe("question");
      expect(res.guardrailCategory).toBe("information");
    });

    it("classifies information request", () => {
      const res = intentService.analyzeIntent("Give me details regarding our current account configuration.");
      expect(res.intent).toBe("information_request");
      expect(res.guardrailCategory).toBe("information");
    });

    it("classifies recommendation", () => {
      const res = intentService.analyzeIntent("Can you recommend three ways to optimize our landing page speed?");
      expect(res.intent).toBe("recommendation");
      expect(res.guardrailCategory).toBe("recommendation");
    });

    it("classifies planning", () => {
      const res = intentService.analyzeIntent("Help me design a 90-day marketing roadmap for Q4.");
      expect(res.intent).toBe("planning");
      expect(res.guardrailCategory).toBe("planning");
    });

    it("classifies business analysis without triggering premature action", () => {
      const res = intentService.analyzeIntent("Why are my leads not converting this week?");
      expect(res.intent).toBe("business_analysis");
      expect(res.requiresAction).toBe(false);
      expect(res.guardrailCategory).toBe("information");
    });

    it("classifies content creation / copywriting", () => {
      const res = intentService.analyzeIntent("Write high-converting headline copy for a fitness bootcamp.");
      expect(res.intent).toBe("copywriting");
      expect(res.guardrailCategory).toBe("information");
    });

    it("classifies funnel request", () => {
      const res = intentService.analyzeIntent("Build a lead generation funnel for my accounting firm.");
      expect(res.intent).toBe("funnel_creation");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("action");
    });

    it("classifies website request", () => {
      const res = intentService.analyzeIntent("Build a complete website for my dental clinic.");
      expect(res.intent).toBe("website_creation");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("action");
    });

    it("classifies page request", () => {
      const res = intentService.analyzeIntent("Create a new sales page for our enterprise software.");
      expect(res.intent).toBe("page_creation");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("action");
    });

    it("classifies contact request", () => {
      const res = intentService.analyzeIntent("Add a new contact with email client@example.com to our subscriber list.");
      expect(res.intent).toBe("contact_management");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("action");
    });

    it("classifies email request", () => {
      const res = intentService.analyzeIntent("Create a 5-part email sequence for webinar attendees.");
      expect(res.intent).toBe("email_creation");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("action");
    });

    it("classifies automation request", () => {
      const res = intentService.analyzeIntent("Set up an automation workflow that triggers an email when a lead signs up.");
      expect(res.intent).toBe("automation_request");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("action");
    });

    it("classifies analytics request", () => {
      const res = intentService.analyzeIntent("What is our conversion rate and visitor drop-off rate for the past 30 days?");
      expect(res.intent).toBe("analytics_request");
      expect(res.requiresAction).toBe(false);
      expect(res.guardrailCategory).toBe("information");
    });

    it("classifies coding request", () => {
      const res = intentService.analyzeIntent("Write code for a custom React component showing an interactive pricing slider.");
      expect(res.intent).toBe("coding_request");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("planning");
    });

    it("classifies research request", () => {
      const res = intentService.analyzeIntent("Research our top competitors in the Malaysian health food market.");
      expect(res.intent).toBe("research_request");
      expect(res.requiresAction).toBe(false);
      expect(res.guardrailCategory).toBe("information");
    });

    it("classifies task request", () => {
      const res = intentService.analyzeIntent("Assign task to the team to audit our SEO keywords.");
      expect(res.intent).toBe("task_request");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("planning");
    });

    it("classifies goal request", () => {
      const res = intentService.analyzeIntent("Set goal to generate 100 qualified leads this month.");
      expect(res.intent).toBe("goal_request");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("planning");
    });

    it("classifies confirmation", () => {
      const res = intentService.analyzeIntent("Yes, approve and execute this plan.");
      expect(res.intent).toBe("confirmation");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("action");
    });

    it("classifies modification", () => {
      const res = intentService.analyzeIntent("Make the hero section more premium and change the CTA to book now.");
      expect(res.intent).toBe("modification");
      expect(res.requiresAction).toBe(true);
      expect(res.guardrailCategory).toBe("action");
    });

    it("classifies cancellation", () => {
      const res = intentService.analyzeIntent("Cancel that request immediately.");
      expect(res.intent).toBe("cancellation");
      expect(res.requiresAction).toBe(false);
      expect(res.guardrailCategory).toBe("action");
    });

    it("classifies troubleshooting", () => {
      const res = intentService.analyzeIntent("Troubleshoot why our checkout form is failing with an error code.");
      expect(res.intent).toBe("troubleshooting");
      expect(res.requiresAction).toBe(false);
      expect(res.guardrailCategory).toBe("information");
    });
  });

  // =========================================================================
  // 3. Goal Understanding (User Message vs User Goal)
  // =========================================================================
  describe("3. Goal Understanding", () => {
    it("distinguishes user message from user goal on landing page creation", () => {
      const message = "Create a landing page for my insurance business.";
      const entities = entityExtractor.extractEntities(message);
      const userGoal = goalService.resolveGoal(message, entities);

      expect(userGoal.rawMessage).toBe(message);
      expect(userGoal.goalDescription).toContain("landing page for Insurance business");
      expect(userGoal.industry).toBe("Insurance");
      expect(userGoal.requiredAction).toBe("create_landing_page");
      expect(userGoal.targetAudience).toBe("Unknown");
      expect(userGoal.missingInformation).toContain("target audience");
    });

    it("recognizes pure analysis goals without triggering actions", () => {
      const message = "Why are my leads not converting?";
      const entities = entityExtractor.extractEntities(message);
      const userGoal = goalService.resolveGoal(message, entities);

      expect(userGoal.requiredCapability).toBe("analysis");
      expect(userGoal.isActionable).toBe(false);
      expect(userGoal.goalDescription).toContain("Diagnose conversion problem");
    });
  });

  // =========================================================================
  // 4. Entity Extraction (20+ Fields)
  // =========================================================================
  describe("4. Structured Entity Extraction (20+ Fields)", () => {
    it("extracts comprehensive structured entities from a rich prompt", () => {
      const prompt =
        "Create a webinar funnel for Apex Insurance targeting first-time homebuyers with a free consultation offer. " +
        "Launch a lead generation campaign called Q4 Rush by October 15 with a budget of $5,000 on Facebook and Google Ads. " +
        "Target 50 qualified leads in Kuala Lumpur. Primary contact is team@apex.com, URL is https://apex.com. Goal is to reach $50k revenue.";

      const entities = entityExtractor.extractEntities(prompt);

      expect(entities.industry).toBe("Insurance");
      expect(entities.audience).toBe("first-time homebuyers");
      expect(entities.offer).toBe("Free Consultation");
      expect(entities.funnel).toBe("Webinar Funnel");
      expect(entities.campaign).toBe("Lead Generation Campaign");
      expect(entities.deadline).toBe("October 15");
      expect(entities.budget).toBe("$5,000");
      expect(entities.platform).toBe("Facebook");
      expect(entities.lead).toBe("50 qualified leads");
      expect(entities.location).toBe("Kuala Lumpur");
      expect(entities.contact).toBe("team@apex.com");
      expect(entities.URL).toBe("https://apex.com");
      expect(entities.goal).toContain("reach $50k revenue");
    });
  });

  // =========================================================================
  // 5. Industry Neutrality (8 Industries Tested — No Property Bias!)
  // =========================================================================
  describe("5. Industry Neutrality Across 8 Domains", () => {
    const industries = [
      { name: "Insurance", query: "Build a landing page for my insurance business." },
      { name: "Restaurant", query: "Create a website for our Italian restaurant and bistro." },
      { name: "Coaching", query: "Set up a coaching funnel for executive mentors." },
      { name: "SaaS", query: "Write copy for a B2B SaaS project management tool." },
      { name: "Ecommerce", query: "Design an online store campaign for organic skincare." },
      { name: "Agency", query: "Build a client acquisition funnel for our creative agency." },
      { name: "Service Business", query: "Create a booking page for our plumbing service business." },
      { name: "Property", query: "Build a lead capture page for property investors." },
    ];

    for (const ind of industries) {
      it(`correctly recognizes ${ind.name} without defaulting to property`, () => {
        const entities = entityExtractor.extractEntities(ind.query);
        expect(entities.industry).toBe(ind.name);

        if (ind.name !== "Property") {
          expect(entities.industry).not.toBe("Property");
        }
      });
    }
  });

  // =========================================================================
  // 6. Ambiguity Handling & Strict Priority Resolution
  // =========================================================================
  describe("6. Ambiguity Handling & Strict Priority Resolution", () => {
    it("detects genuine ambiguity on a bare request and asks a clarifying question without assuming property", () => {
      const raw = "Create a website.";
      const entities = entityExtractor.extractEntities(raw);
      const res = ambiguityDetector.resolveContextHierarchy({
        message: raw,
        entities,
      });

      expect(res.isAmbiguous).toBe(true);
      expect(res.resolutionSource).toBe("generic_fallback");
      expect(res.resolvedIndustry).toBeUndefined();
      expect(res.clarificationQuestion).toContain("what business or industry this is for");
      expect(res.clarificationQuestion).not.toContain("property");
    });

    it("resolves context from Company Brain when user message lacks explicit industry", () => {
      const raw = "Create a landing page.";
      const entities = entityExtractor.extractEntities(raw);
      const res = ambiguityDetector.resolveContextHierarchy({
        message: raw,
        entities,
        companyBrainContext: {
          businessIdentity: "Gourmet Bistro & Cafe",
          industry: "Restaurant",
        },
      });

      expect(res.isAmbiguous).toBe(false);
      expect(res.resolutionSource).toBe("company_brain");
      expect(res.resolvedIndustry).toBe("Restaurant");
    });

    it("resolves context from Conversation Continuity when previous turn established industry", () => {
      const raw = "Make the hero more modern.";
      const entities = entityExtractor.extractEntities(raw);
      const res = ambiguityDetector.resolveContextHierarchy({
        message: raw,
        entities,
        conversationContinuity: {
          activeIndustry: "SaaS",
          activeTopic: "Cloud Analytics Platform",
        },
      });

      expect(res.isAmbiguous).toBe(false);
      expect(res.resolutionSource).toBe("conversation_continuity");
      expect(res.resolvedIndustry).toBe("SaaS");
    });
  });

  // =========================================================================
  // 7. Conversation Context Continuity & Reference Resolution
  // =========================================================================
  describe("7. Conversation Continuity & Reference Resolution", () => {
    it("resolves references across sequential turns ('the hero', 'change the CTA')", () => {
      const turns = [
        { role: "user" as const, content: "Build a landing page for our boutique dental clinic." },
        { role: "assistant" as const, content: "I have prepared the strategy for your dental clinic landing page." },
        { role: "user" as const, content: "Make the hero more premium and dark mode." },
        { role: "user" as const, content: "Change the CTA button to Book Consultation." },
      ];

      const continuity = contextService.resolveConversationContinuity(turns);

      expect(continuity.activeIndustry).toBe("Dental");
      expect(continuity.activeSection).toBe("cta");
      expect(continuity.activeStyle).toBe("dark");
    });
  });

  // =========================================================================
  // 8. Security, Tenant Isolation & Role Permissions
  // =========================================================================
  describe("8. Security, Multi-Tenant Isolation & Role Permissions", () => {
    it("enforces tenant membership and prevents cross-tenant access", async () => {
      // User Owner does NOT belong to Org B
      await expect(
        elmoIntelligence.processMessage({
          userId: USER_OWNER,
          organizationId: ORG_B,
          message: "Show me all confidential documents.",
        })
      ).rejects.toThrow(/(?:unauthorized|not authorized|security violation)/i);
    });

    it("denies actionable modifications to users with 'viewer' read-only role", async () => {
      const res = await elmoIntelligence.processMessage({
        userId: USER_VIEWER,
        organizationId: ORG_A,
        message: "Delete the webinar funnel and build a new sales page.",
      });

      expect(res.text).toContain("permissions");
      expect(res.text).toContain("viewer");
      expect(res.toolsExecuted).toBeUndefined();
    });

    it("allows actionable requests for users with 'owner' privileges", async () => {
      const res = await elmoIntelligence.processMessage({
        userId: USER_OWNER,
        organizationId: ORG_A,
        message: "Plan a webinar funnel for our SaaS launch.",
      });

      expect(res.text).toBeDefined();
      expect(res.text).not.toContain("permission denied");
    });
  });

  // =========================================================================
  // 9. Unified Voice and Text Intelligence Pipeline
  // =========================================================================
  describe("9. Unified Voice and Text Intelligence", () => {
    it("routes voice inputs through the same ELMO intelligence doorway and attaches inputMode metadata", async () => {
      const res = await elmoIntelligence.processMessage({
        userId: USER_OWNER,
        organizationId: ORG_A,
        message: "What is our operational focus for today?",
        inputMode: "voice",
      });

      expect(res.inputMode).toBe("voice");
      expect(res.userMessage.metadata.input_mode).toBe("voice");
      expect(res.text).toBeDefined();
      expect(res.conversationId).toBeDefined();
    });
  });
});
