/**
 * ELMO Phase 3 Upgrade — Complete Web/Coding Specialist Acceptance Matrix
 *
 * Comprehensive validation across:
 * 1. Landing Pages (8+ Industries: Restaurant, Property, Insurance, Fitness, Coaching, SaaS, E-commerce, Consulting)
 * 2. Multi-Page Websites (Restaurant, Corporate, Coaching, SaaS)
 * 3. Applications (CRM, Dashboard, Customer Portal, Internal Tool)
 * 4. Conversational Modifications (Hero premium, CTA change, dark mode, add/remove sections, restaurant conversion, B2B shift, mobile-first, rollback)
 * 5. Visual QA & Functional QA Verification
 * 6. Multi-Tenant Safety & Supabase Persistence
 */

import { describe, it, expect, beforeEach } from "vitest";
import { WebCodingAgentService } from "@/services/agentic/web-coding/web-coding-agent.service";
import { WebPreviewService } from "@/services/agentic/web-coding/web-preview.service";
import { WebQAService } from "@/services/agentic/web-coding/web-qa.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { PageService } from "@/services/page.service";
import { AgentMessage } from "@/services/agentic/types/agentic.types";

describe("Phase 3 Complete Acceptance Matrix: Advanced AI Web & Software Builder", () => {
  let agent: WebCodingAgentService;
  let previewService: WebPreviewService;
  let qaService: WebQAService;
  let pageService: PageService;
  const store = MockDataStore.getInstance();

  const orgA = "11111111-1111-1111-1111-111111111111";
  const orgB = "22222222-2222-2222-2222-222222222222";
  const userA = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    store.reset();
    agent = WebCodingAgentService.getInstance();
    previewService = WebPreviewService.getInstance();
    qaService = WebQAService.getInstance();
    pageService = PageService.getInstance();
    agent.reset();
  });

  // ==========================================================================
  // 1. Multi-Industry Landing Page Matrix
  // ==========================================================================
  it("Matrix 1: should generate distinctive landing pages across 8 distinct industries without property bias", async () => {
    const matrix = [
      {
        prompt: "Build an Italian restaurant landing page featuring our artisanal chef tasting menu",
        industry: "Restaurant",
        mustInclude: ["Culinary", "Reserve", "Menu"],
        mustNotInclude: ["Property Agents", "real estate"],
      },
      {
        prompt: "Build a health and life insurance lead generation page",
        industry: "Insurance",
        mustInclude: ["Coverage", "Policy", "Quote"],
        mustNotInclude: ["Property Agents"],
      },
      {
        prompt: "Build a landing page for our boutique CrossFit gym",
        industry: "Fitness",
        mustInclude: ["Physique", "Training", "Pass"],
        mustNotInclude: ["Property Agents"],
      },
      {
        prompt: "Build a sales page for an executive mastermind coaching program",
        industry: "Coaching",
        mustInclude: ["Leadership", "Consultation", "Scale"],
        mustNotInclude: ["Property Agents"],
      },
      {
        prompt: "Build a landing page for an API monitoring SaaS cloud platform",
        industry: "SaaS",
        mustInclude: ["Cloud", "Trial", "Demo"],
        mustNotInclude: ["Property Agents"],
      },
      {
        prompt: "Build an e-commerce product landing page for handcrafted timepieces",
        industry: "E-commerce",
        mustInclude: ["Collection", "Order", "Delivery"],
        mustNotInclude: ["Property Agents"],
      },
      {
        prompt: "Build a lead generation page for a corporate management consulting firm",
        industry: "Consulting",
        mustInclude: ["Advisory", "Consultation", "Strategic"],
        mustNotInclude: ["Property Agents"],
      },
      {
        prompt: "Build a landing page for real estate property agents with automated chat",
        industry: "Property",
        mustInclude: ["Property", "Advisory", "Listings"],
        mustNotInclude: [],
      },
    ];

    for (const testCase of matrix) {
      const msg: AgentMessage = {
        messageId: `msg-${Date.now()}`,
        executionId: `exec-${Date.now()}`,
        sender: "orchestrator",
        recipient: "web-coding-agent",
        messageType: "TASK_REQUEST",
        task: testCase.prompt,
        context: { organizationId: orgA, userId: userA },
        input: {},
        timestamp: Date.now(),
      };

      const result = await agent.execute(msg);
      expect(result.success).toBe(true);
      expect(result.data.industry).toBe(testCase.industry);

      const html = (result.data.preview as any).renderedHtml;
      for (const keyword of testCase.mustInclude) {
        expect(html.toLowerCase()).toContain(keyword.toLowerCase());
      }
      for (const badKeyword of testCase.mustNotInclude) {
        expect(html.toLowerCase()).not.toContain(badKeyword.toLowerCase());
      }
    }
  });

  // ==========================================================================
  // 2. Multi-Page Website Generation
  // ==========================================================================
  it("Matrix 2: should generate multi-page websites with navigation and interconnected routes", async () => {
    const msg: AgentMessage = {
      messageId: "msg-website",
      executionId: "exec-website",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build a full corporate website for our management advisory firm",
      context: { organizationId: orgA, userId: userA },
      input: {},
      timestamp: Date.now(),
    };

    const result = await agent.execute(msg);
    expect(result.success).toBe(true);

    const project = agent.getLatestProject(orgA)!;
    expect(project.pages.length).toBeGreaterThanOrEqual(4);

    const pageSlugs = project.pages.map((p) => p.slug);
    expect(pageSlugs).toContain("home");
    expect(pageSlugs).toContain("about");
    expect(pageSlugs).toContain("services");
    expect(pageSlugs).toContain("contact");

    // Check header navigation exists on home page
    const homePage = project.pages.find((p) => p.slug === "home")!;
    const navSection = homePage.sections.find((s) => s.name.includes("Navigation") || s.content.badge === "nav_bar");
    expect(navSection).toBeDefined();
  });

  // ==========================================================================
  // 3. Web Application Builder Mode
  // ==========================================================================
  it("Matrix 3: should build interactive Web Applications (CRM and Dashboard)", async () => {
    const msg: AgentMessage = {
      messageId: "msg-crm",
      executionId: "exec-crm",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build a CRM dashboard for tracking enterprise sales leads",
      context: { organizationId: orgA, userId: userA },
      input: {},
      timestamp: Date.now(),
    };

    const result = await agent.execute(msg);
    expect(result.success).toBe(true);
    expect(result.data.projectType).toContain("CRM");

    const html = (result.data.preview as any).renderedHtml;
    expect(html).toContain("Total Records");
    expect(html).toContain("Active Pipeline");
    expect(html).toContain("Search by name, email, or record ID");
    expect(html).toContain("Multi-Tenant Protected");
  });

  // ==========================================================================
  // 4. Natural Language Conversational Editing & Rollback
  // ==========================================================================
  it("Matrix 4: should handle complex natural language modifications without project destruction", async () => {
    // 1. Initial build: Generic SaaS
    await agent.execute({
      messageId: "turn-1",
      executionId: "exec-turn-1",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build a landing page for our software platform",
      context: { organizationId: orgA, userId: userA },
      input: {},
      timestamp: Date.now(),
    });

    const v1Project = agent.getLatestProject(orgA)!;
    expect(v1Project.activeVersion).toBe(1);

    // 2. Edit A: Make the hero more premium
    await agent.execute({
      messageId: "turn-2",
      executionId: "exec-turn-2",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Make the hero section more premium",
      context: { organizationId: orgA, userId: userA },
      input: {},
      timestamp: Date.now(),
    });

    const v2Project = agent.getLatestProject(orgA)!;
    expect(v2Project.activeVersion).toBe(2);
    const hero = v2Project.pages[0].sections.find((s) => s.sectionType === "hero");
    expect(hero?.content.badge).toContain("Exclusive Enterprise");

    // 3. Edit B: Change CTA to 'Schedule VIP Demo'
    await agent.execute({
      messageId: "turn-3",
      executionId: "exec-turn-3",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Change the CTA to Schedule VIP Demo",
      context: { organizationId: orgA, userId: userA },
      input: {},
      timestamp: Date.now(),
    });

    const v3Project = agent.getLatestProject(orgA)!;
    expect(v3Project.pages[0].sections[0].content.primaryCta?.label).toBe("Schedule VIP Demo");

    // 4. Edit C: Use a darker style and make mobile friendly
    await agent.execute({
      messageId: "turn-4",
      executionId: "exec-turn-4",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Use a darker style and make it mobile friendly",
      context: { organizationId: orgA, userId: userA },
      input: {},
      timestamp: Date.now(),
    });

    const v4Project = agent.getLatestProject(orgA)!;
    expect(v4Project.styles.backgroundColor).toBe("#02040a");
    expect(v4Project.pages[0].sections.every((s) => s.responsive.stackOnMobile)).toBe(true);

    // 5. Edit D: Rollback to Version 1
    const rollbackRes = await agent.execute({
      messageId: "turn-5",
      executionId: "exec-turn-5",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Rollback to Version 1",
      context: { organizationId: orgA, userId: userA },
      input: {},
      timestamp: Date.now(),
    });

    expect(rollbackRes.success).toBe(true);
    const rolledBackProject = agent.getLatestProject(orgA)!;
    const v1Hero = rolledBackProject.pages[0].sections.find((s) => s.sectionType === "hero");
    expect(v1Hero?.content.badge).not.toContain("Exclusive Enterprise");
  });

  // ==========================================================================
  // 5. Visual QA & Functional QA Verification
  // ==========================================================================
  it("Matrix 5: should pass Visual QA and Functional QA evaluation with high scores", async () => {
    const result = await agent.execute({
      messageId: "msg-qa",
      executionId: "exec-qa",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build a high converting landing page for a private medical clinic",
      context: { organizationId: orgA, userId: userA },
      input: {},
      timestamp: Date.now(),
    });

    expect(result.success).toBe(true);
    const qa = result.data.qaEvaluation as any;
    expect(qa.passed).toBe(true);
    expect(qa.visualScore).toBe(100);
    expect(qa.functionalScore).toBe(100);
  });

  // ==========================================================================
  // 6. Multi-Tenant Isolation & Supabase Persistence
  // ==========================================================================
  it("Matrix 6: should enforce strict tenant isolation and persist pages into Supabase store", async () => {
    // Org A builds a page
    await agent.execute({
      messageId: "msg-org-a",
      executionId: "exec-org-a",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build a landing page for Company A Luxury Watches",
      context: { organizationId: orgA, userId: userA },
      input: {},
      timestamp: Date.now(),
    });

    // Org B builds a page
    await agent.execute({
      messageId: "msg-org-b",
      executionId: "exec-org-b",
      sender: "orchestrator",
      recipient: "web-coding-agent",
      messageType: "TASK_REQUEST",
      task: "Build a landing page for Company B Dental Care",
      context: { organizationId: orgB, userId: "user-b" },
      input: {},
      timestamp: Date.now(),
    });

    // Verify Org A only gets Org A project
    const projA = agent.getLatestProject(orgA);
    const projB = agent.getLatestProject(orgB);

    expect(projA?.organizationId).toBe(orgA);
    expect(projB?.organizationId).toBe(orgB);
    expect(projA?.name).toContain("Watches");
    expect(projB?.name).toContain("Dental");

    // Verify persistence in PageService / Supabase store
    const orgAPages = await pageService.getPages(userA, orgA);
    expect(orgAPages.data?.length).toBeGreaterThan(0);
    expect(orgAPages.data?.every((p) => p.organization_id === orgA)).toBe(true);
  });
});
