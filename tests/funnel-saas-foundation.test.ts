/**
 * ELMO Phase 1 — Funnel SaaS Foundation Integration Tests
 *
 * Verifies:
 * 1. Multi-tenant Funnel CRUD, step ordering, business context storage & RLS isolation.
 * 2. Page & structured Section components (hero, benefits, pricing, CTA, etc.)
 * 3. Contact CRUD, tag mapping, and journey events.
 * 4. Form submission pipeline (Submit -> Contact -> Tag -> Contact Event -> Analytics Event).
 * 5. Email templates, email sequences, and sequence step delay timing calculations.
 * 6. Automation rule definitions (trigger -> condition -> action).
 * 7. Analytics event tracking and funnel conversion metric aggregation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { FunnelService } from "@/services/funnel.service";
import { PageService } from "@/services/page.service";
import { ContactService } from "@/services/contact.service";
import { FormService } from "@/services/form.service";
import { EmailService } from "@/services/email.service";
import { AutomationService } from "@/services/automation.service";
import { AnalyticsService } from "@/services/analytics.service";

describe("ELMO Phase 1: Funnel SaaS Foundation Architecture", () => {
  const store = MockDataStore.getInstance();
  const funnelService = FunnelService.getInstance();
  const pageService = PageService.getInstance();
  const contactService = ContactService.getInstance();
  const formService = FormService.getInstance();
  const emailService = EmailService.getInstance();
  const automationService = AutomationService.getInstance();
  const analyticsService = AnalyticsService.getInstance();

  const orgA = "11111111-1111-1111-1111-111111111111";
  const userA = "00000000-0000-0000-0000-000000000001"; // Member of orgA

  const orgB = "99999999-9999-9999-9999-999999999999"; // Other org
  const userB = "88888888-8888-8888-8888-888888888888"; // Member of orgB only

  beforeEach(() => {
    store.reset();
    // Register userB into orgB
    store.organizations.set(orgB, {
      id: orgB,
      name: "Rival Enterprise",
      slug: "rival",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    store.organizationMembers.set("mem-b", {
      id: "mem-b",
      organization_id: orgB,
      user_id: userB,
      role: "owner",
      created_at: new Date().toISOString(),
    });
  });

  // --------------------------------------------------------------------------
  // 1. Funnels & Steps
  // --------------------------------------------------------------------------
  describe("1. Funnel & Step Architecture", () => {
    it("should create a funnel with rich business context and enforce RLS", async () => {
      const created = await funnelService.createFunnel({
        userId: userA,
        organizationId: orgA,
        name: "Webinar Masterclass Funnel",
        funnelType: "Webinar",
        goal: "Acquire 250 high-ticket coaching leads",
        targetAudience: "B2B Consultants & Agency Owners",
        offer: "Free 60-Minute Automation Workshop",
        primaryConversionGoal: "Book a consultation call",
        businessContext: {
          problem: "Overwhelmed with manual operations",
          desired_outcome: "Autonomous AI-powered pipeline",
          traffic_source: "LinkedIn Organic & YouTube",
          primary_cta: "Reserve My Seat",
        },
      });

      expect(created.error).toBeNull();
      expect(created.data).toBeDefined();
      expect(created.data?.name).toBe("Webinar Masterclass Funnel");
      expect(created.data?.funnel_type).toBe("Webinar");

      const bContext = created.data?.business_context as Record<string, unknown>;
      expect(bContext.problem).toBe("Overwhelmed with manual operations");
      expect(bContext.primary_cta).toBe("Reserve My Seat");

      // RLS Check: userB in orgB must NOT be able to access this funnel
      const unauthorizedGet = await funnelService.getFunnelById(userB, orgB, created.data!.id);
      expect(unauthorizedGet.data).toBeNull();
      expect(unauthorizedGet.error).toContain("Funnel not found");

      // Valid get for userA in orgA
      const authorizedGet = await funnelService.getFunnelById(userA, orgA, created.data!.id);
      expect(authorizedGet.data?.id).toBe(created.data!.id);
    });

    it("should manage sequential funnel steps in correct order", async () => {
      const funnelRes = await funnelService.createFunnel({
        userId: userA,
        organizationId: orgA,
        name: "Course Launch Funnel",
        funnelType: "Course",
      });
      const funnelId = funnelRes.data!.id;

      // Add Step 1: Opt-in
      await funnelService.createFunnelStep({
        userId: userA,
        organizationId: orgA,
        funnelId,
        stepType: "opt-in",
        name: "Lead Magnet Opt-In",
      });

      // Add Step 2: Sales Page
      await funnelService.createFunnelStep({
        userId: userA,
        organizationId: orgA,
        funnelId,
        stepType: "sales page",
        name: "Mastery Course Presentation",
      });

      // Add Step 3: Checkout
      await funnelService.createFunnelStep({
        userId: userA,
        organizationId: orgA,
        funnelId,
        stepType: "checkout",
        name: "Stripe Checkout",
      });

      const stepsRes = await funnelService.getFunnelSteps(userA, orgA, funnelId);
      expect(stepsRes.data).toHaveLength(3);
      expect(stepsRes.data![0].step_type).toBe("opt-in");
      expect(stepsRes.data![0].step_order).toBe(1);
      expect(stepsRes.data![1].step_type).toBe("sales page");
      expect(stepsRes.data![1].step_order).toBe(2);
      expect(stepsRes.data![2].step_type).toBe("checkout");
      expect(stepsRes.data![2].step_order).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Pages & Structured Sections
  // --------------------------------------------------------------------------
  describe("2. Page & Structured Section Component Architecture", () => {
    it("should build a page with structured section components rather than raw HTML", async () => {
      const pageRes = await pageService.createPage({
        userId: userA,
        organizationId: orgA,
        name: "Webinar Registration",
        slug: "webinar-registration",
        pageType: "webinar",
        title: "Scale to 7 Figures with AI — Live Workshop",
      });
      expect(pageRes.data).toBeDefined();
      const pageId = pageRes.data!.id;

      // Add Hero Section
      const hero = await pageService.createSection({
        userId: userA,
        organizationId: orgA,
        pageId,
        sectionType: "hero",
        content: {
          headline: "Build Your Autonomous AI Business",
          subheadline: "Learn the exact system top CEOs use to replace 20+ hours of busywork.",
          ctaButtonText: "Claim Free Ticket",
        },
      });
      expect(hero.data?.section_type).toBe("hero");

      // Add Benefits Section
      const benefits = await pageService.createSection({
        userId: userA,
        organizationId: orgA,
        pageId,
        sectionType: "benefits",
        content: {
          items: ["Zero Coding Required", "Deploy in 48 Hours", "Instant Multilingual Reach"],
        },
      });
      expect(benefits.data?.section_type).toBe("benefits");

      // Add Form Section
      const formSec = await pageService.createSection({
        userId: userA,
        organizationId: orgA,
        pageId,
        sectionType: "form",
        content: {
          formTitle: "Reserve Your Spot",
        },
      });
      expect(formSec.data?.section_type).toBe("form");

      const sections = await pageService.getSections(userA, orgA, pageId);
      expect(sections.data).toHaveLength(3);
      expect(sections.data!.map((s) => s.section_type)).toEqual(["hero", "benefits", "form"]);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Contacts, Tags & Contact Events
  // --------------------------------------------------------------------------
  describe("3. Contact, Tag & Journey Event Architecture", () => {
    it("should register contacts, apply tags, and record lifecycle events", async () => {
      // Find or create lead
      const contactRes = await contactService.findOrCreateContact({
        userId: userA,
        organizationId: orgA,
        email: "sarah.connor@cyberdyne.io",
        firstName: "Sarah",
        lastName: "Connor",
        tags: ["webinar-attendee", "vip-lead"],
      });

      expect(contactRes.data).toBeDefined();
      expect(contactRes.data?.email).toBe("sarah.connor@cyberdyne.io");
      expect(contactRes.data?.tags.map((t) => t.name).sort()).toEqual(["vip-lead", "webinar-attendee"].sort());

      // Record journey event
      const eventRes = await contactService.recordEvent({
        userId: userA,
        organizationId: orgA,
        contactId: contactRes.data!.id,
        eventType: "webinar_joined",
        metadata: { durationMinutes: 52 },
      });
      expect(eventRes.data?.event_type).toBe("webinar_joined");

      const events = await contactService.getContactEvents(userA, orgA, contactRes.data!.id);
      expect(events.data).toHaveLength(1);
      expect(events.data![0].event_type).toBe("webinar_joined");
    });
  });

  // --------------------------------------------------------------------------
  // 4. Form Submission Pipeline
  // --------------------------------------------------------------------------
  describe("4. Form Submission & Lead Attribution Pipeline", () => {
    it("should execute: Form Submit -> Create Contact -> Add Tag -> Contact Event -> Analytics Event", async () => {
      const formRes = await formService.createForm({
        userId: userA,
        organizationId: orgA,
        name: "Lead Magnet Download",
        fields: [
          { name: "name", label: "Full Name", type: "text", required: true },
          { name: "email", label: "Email Address", type: "email", required: true },
        ],
        submitAction: {
          add_tags: ["lead-magnet-downloaded", "newsletter"],
        },
      });
      const formId = formRes.data!.id;

      // Visitor submits form
      const submitRes = await formService.submitForm({
        organizationId: orgA,
        formId,
        submissionData: {
          name: "John Wick",
          email: "john@continental.org",
        },
      });

      expect(submitRes.data?.contactId).toBeDefined();

      // Verify contact was created and tagged
      const contact = await contactService.getContactById(userA, orgA, submitRes.data!.contactId!);
      expect(contact.data?.email).toBe("john@continental.org");
      expect(contact.data?.tags.map((t) => t.name)).toContain("lead-magnet-downloaded");

      // Verify contact event was recorded
      const contactEvents = await contactService.getContactEvents(userA, orgA, submitRes.data!.contactId!);
      expect(contactEvents.data?.some((e) => e.event_type === "form_submission")).toBe(true);

      // Verify global analytics event was recorded
      const analytics = await analyticsService.getEvents(userA, orgA, { eventType: "form_submission" });
      expect(analytics.data?.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Email Templates & Sequences
  // --------------------------------------------------------------------------
  describe("5. Email Foundation Architecture", () => {
    it("should create templates and sequence steps with cumulative delay timing", async () => {
      const templateRes = await emailService.createTemplate({
        userId: userA,
        organizationId: orgA,
        name: "Webinar Confirmation",
        subject: "Your Spot is Confirmed, {{first_name}}!",
        body: "Here is your private Zoom link...",
        variables: ["first_name", "zoom_link"],
      });
      expect(templateRes.data?.subject).toBe("Your Spot is Confirmed, {{first_name}}!");

      const seqRes = await emailService.createSequence({
        userId: userA,
        organizationId: orgA,
        name: "Webinar 3-Day Nurture Sequence",
      });
      const seqId = seqRes.data!.id;

      // Step 1: Immediate confirmation (0 hours)
      await emailService.addSequenceStep({
        userId: userA,
        organizationId: orgA,
        sequenceId: seqId,
        delayValue: 0,
        delayUnit: "hours",
        subject: "Welcome to the Workshop",
        body: "Access details inside...",
      });

      // Step 2: 24 hours later
      await emailService.addSequenceStep({
        userId: userA,
        organizationId: orgA,
        sequenceId: seqId,
        delayValue: 24,
        delayUnit: "hours",
        subject: "Preparation Worksheet",
        body: "Download your workbook before tomorrow's call...",
      });

      const steps = await emailService.getSequenceSteps(userA, orgA, seqId);
      expect(steps.data).toHaveLength(2);
      expect(steps.data![0].delay_value).toBe(0);
      expect(steps.data![1].delay_value).toBe(24);

      // Delay calculation helper check
      const delayMs = emailService.calculateStepDelayMs(24, "hours");
      expect(delayMs).toBe(24 * 60 * 60 * 1000);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Automation Definitions
  // --------------------------------------------------------------------------
  describe("6. Automation Foundation Architecture", () => {
    it("should define TRIGGER -> CONDITION -> ACTION automation rules", async () => {
      const autoRes = await automationService.createAutomation({
        userId: userA,
        organizationId: orgA,
        name: "Form Submission Auto-Enroll",
        trigger: {
          type: "form_submitted",
          config: { form_name: "Webinar Registration" },
        },
        conditions: [
          {
            type: "tag_matches",
            config: { tag: "webinar-lead" },
            order: 1,
          },
        ],
        actions: [
          {
            type: "start_email_sequence",
            config: { sequence_name: "Webinar Nurture" },
            order: 1,
          },
        ],
      });

      expect(autoRes.data).toBeDefined();
      expect(autoRes.data?.triggers).toHaveLength(1);
      expect(autoRes.data?.triggers[0].trigger_type).toBe("form_submitted");
      expect(autoRes.data?.conditions).toHaveLength(1);
      expect(autoRes.data?.actions).toHaveLength(1);
      expect(autoRes.data?.actions[0].action_type).toBe("start_email_sequence");
    });
  });

  // --------------------------------------------------------------------------
  // 7. Event-Based Analytics & Aggregation
  // --------------------------------------------------------------------------
  describe("7. Event Analytics & Conversion Calculation", () => {
    it("should record funnel visitor & conversion events and calculate metrics", async () => {
      const funnelId = "fnl-analytics-test";

      // 10 visitors
      for (let i = 0; i < 10; i++) {
        await analyticsService.recordEvent({
          organizationId: orgA,
          eventType: "funnel_visit",
          funnelId,
        });
      }

      // 2 leads
      for (let i = 0; i < 2; i++) {
        await analyticsService.recordEvent({
          organizationId: orgA,
          eventType: "conversion",
          funnelId,
        });
      }

      // 1 purchase
      await analyticsService.recordEvent({
        organizationId: orgA,
        eventType: "purchase",
        funnelId,
      });

      const metrics = await analyticsService.getFunnelMetrics(userA, orgA, funnelId);
      expect(metrics.data).toBeDefined();
      expect(metrics.data?.totalVisitors).toBe(10);
      expect(metrics.data?.totalLeads).toBe(2);
      expect(metrics.data?.totalPurchases).toBe(1);
      expect(metrics.data?.conversionRate).toBe(20); // 2 / 10 = 20%
    });
  });
});
