/**
 * ELMO Phase 3 — Web Project Engine & Design Intelligence Test Suite
 */

import { describe, it, expect, beforeEach } from "vitest";
import { WebProjectEngine } from "@/services/agentic/web-coding/web-project-engine.service";
import { DesignIntelligenceEngine } from "@/services/agentic/web-coding/design-intelligence.service";
import { PageStrategyEngine } from "@/services/agentic/web-coding/page-strategy-engine.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { AgentMessage } from "@/services/agentic/types/agentic.types";

describe("Phase 3: WebProjectEngine & DesignIntelligenceEngine", () => {
  let projectEngine: WebProjectEngine;
  let designEngine: DesignIntelligenceEngine;
  let strategyEngine: PageStrategyEngine;
  let memoryService: ElmoMemoryService;
  const store = MockDataStore.getInstance();

  const orgId = "11111111-1111-1111-1111-111111111111";
  const userId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    store.reset();
    projectEngine = WebProjectEngine.getInstance();
    designEngine = DesignIntelligenceEngine.getInstance();
    strategyEngine = PageStrategyEngine.getInstance();
    memoryService = ElmoMemoryService.getInstance();
  });

  // ==========================================================================
  // 1. Industry-Agnostic Project Classification
  // ==========================================================================
  it("should classify arbitrary industries correctly without property bias", async () => {
    const industries = [
      { prompt: "Build a landing page for my Italian restaurant with a seasonal menu", expectedIndustry: "Restaurant", expectedType: "Restaurant Website" },
      { prompt: "Create a lead generation page for my health insurance agency", expectedIndustry: "Insurance", expectedType: "Lead Generation Page" },
      { prompt: "Build a website for my boutique crossfit gym", expectedIndustry: "Fitness", expectedType: "Business Website" },
      { prompt: "Create a sales page for an executive coaching mastermind", expectedIndustry: "Coaching", expectedType: "Sales Page" },
      { prompt: "Generate a marketing website for our cloud monitoring SaaS", expectedIndustry: "SaaS", expectedType: "SaaS Marketing Website" },
      { prompt: "Build an online store for artisanal leather bags", expectedIndustry: "E-commerce", expectedType: "E-commerce Website" },
      { prompt: "Create a clinic website for a pediatric dental center", expectedIndustry: "Healthcare", expectedType: "Business Website" },
    ];

    for (const item of industries) {
      const msg: AgentMessage = {
        messageId: "msg-test",
        executionId: "exec-test",
        sender: "orchestrator",
        recipient: "web-coding-agent",
        messageType: "TASK_REQUEST",
        task: item.prompt,
        context: { organizationId: orgId, userId },
        input: {},
        timestamp: Date.now(),
      };

      const ctx = await projectEngine.analyzeAndClassify(msg);
      expect(ctx.industry).toBe(item.expectedIndustry);
      expect(ctx.industry).not.toBe("Property");
      expect(ctx.targetAudience).not.toContain("Property Agents");
      expect(ctx.targetAudience.length).toBeGreaterThan(0);
      expect(ctx.offer?.length).toBeGreaterThan(0);
    }
  });

  // ==========================================================================
  // 2. Priority Hierarchy: User Explicit > Company Brain > Context > Generic
  // ==========================================================================
  it("Priority Rule: Explicit user input MUST override Company Brain memory", async () => {
    // 1. Seed Company Brain as an Insurance business
    await memoryService.storeMemory({
      organizationId: orgId,
      scope: "organization",
      content: "Business Identity: Premier Life & Health Insurance Brokers.",
      importanceScore: 0.9,
      metadata: { category: "business", entity_type: "business_identity" },
    });

    // 2. User explicitly asks for a restaurant page
    const msg: AgentMessage = {
      messageId: "msg-1",
      executionId: "exec-1",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build a landing page for my new Italian Bistro",
      context: { organizationId: orgId, userId },
      input: {},
      timestamp: Date.now(),
    };

    const ctx = await projectEngine.analyzeAndClassify(msg);
    // Explicit user request MUST take priority over Company Brain!
    expect(ctx.industry).toBe("Restaurant");
    expect(ctx.targetAudience).toContain("Diners");
  });

  it("Priority Rule: Falls back to Company Brain when user prompt does not specify industry", async () => {
    // 1. Seed Company Brain as a Fitness Coaching gym
    await memoryService.storeMemory({
      organizationId: orgId,
      scope: "organization",
      content: "Business Identity: IronPulse High Performance Fitness Gym.",
      importanceScore: 0.9,
      metadata: { category: "business", entity_type: "business_identity" },
    });

    // 2. User prompt gives no explicit industry
    const msg: AgentMessage = {
      messageId: "msg-2",
      executionId: "exec-2",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build our new company landing page",
      context: { organizationId: orgId, userId },
      input: {},
      timestamp: Date.now(),
    };

    const ctx = await projectEngine.analyzeAndClassify(msg);
    expect(ctx.industry).toBe("Fitness");
    expect(ctx.targetAudience).toContain("Athletes");
  });

  // ==========================================================================
  // 3. Design Intelligence Engine
  // ==========================================================================
  it("should generate industry-tailored design systems with harmonious palettes", () => {
    const restaurantDesign = designEngine.generateDesignSystem("Premium", "Restaurant", "dark");
    expect(restaurantDesign.styles.primaryColor).toBe("#f59e0b"); // Warm Amber
    expect(restaurantDesign.styles.secondaryColor).toBe("#ea580c"); // Terracotta
    expect(restaurantDesign.styles.backgroundColor).toBe("#090c15");

    const saasDesign = designEngine.generateDesignSystem("Modern", "SaaS", "dark");
    expect(saasDesign.styles.primaryColor).toBe("#6366f1"); // Electric Indigo
    expect(saasDesign.styles.accentColor).toBe("#06b6d4"); // Cyan
    expect(saasDesign.containerWidth).toBe("wide");

    const luxuryDesign = designEngine.generateDesignSystem("Luxury", "General Business", "dark");
    expect(luxuryDesign.styles.primaryColor).toBe("#d97706"); // Champagne Gold
    expect(luxuryDesign.styles.fontHeading).toContain("Playfair Display");
  });

  // ==========================================================================
  // 4. Page Strategy Engine & 28 Section Library
  // ==========================================================================
  it("should build landing pages with authentic industry copy and zero property fallback", () => {
    const context = {
      projectType: "Restaurant Website" as const,
      industry: "Restaurant",
      businessType: "Restaurant Business",
      businessName: "Osteria Del Sole",
      targetAudience: "Fine Dining Patrons",
      requiredFeatures: ["Menu", "Booking"],
      brandStyle: "Premium" as const,
      technicalRequirements: [],
      assumptions: [],
      offer: "Artisanal 7-Course Truffle Tasting Experience",
    };

    const styles = designEngine.generateDesignSystem("Premium", "Restaurant").styles;
    const project = strategyEngine.planProject("proj-rest-1", orgId, context, styles);

    expect(project.pages.length).toBeGreaterThanOrEqual(1);
    const homePage = project.pages[0];
    expect(homePage.sections.length).toBeGreaterThanOrEqual(4);

    const hero = homePage.sections.find((s) => s.sectionType === "hero");
    expect(hero?.content.badge).toContain("Artisanal Dining");
    expect(hero?.content.headline).toContain("Culinary Artistry");

    const form = homePage.sections.find((s) => s.sectionType === "form");
    expect(form?.content.headline).toContain("Reserve");
    expect(form?.content.formFields?.some((f) => f.name === "guests")).toBe(true);
  });
});
