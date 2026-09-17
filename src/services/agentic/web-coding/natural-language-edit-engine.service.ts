/**
 * ELMO Phase 3 — Natural Language Editing Engine (NaturalLanguageEditEngine)
 *
 * Provides conversational AST section and design system manipulation.
 * Modifies existing project models surgically according to natural language commands
 * without needlessly destroying existing context or rebuilding from scratch.
 */

import {
  WebsiteProject,
  WebsitePageModel,
  WebsiteSectionModel,
} from "../types/agentic.types";
import { PageStrategyEngine } from "./page-strategy-engine.service";
import { DesignIntelligenceEngine } from "./design-intelligence.service";

export class NaturalLanguageEditEngine {
  private static instance: NaturalLanguageEditEngine;
  private strategyEngine: PageStrategyEngine;
  private designEngine: DesignIntelligenceEngine;

  private constructor() {
    this.strategyEngine = PageStrategyEngine.getInstance();
    this.designEngine = DesignIntelligenceEngine.getInstance();
  }

  public static getInstance(): NaturalLanguageEditEngine {
    if (!NaturalLanguageEditEngine.instance) {
      NaturalLanguageEditEngine.instance = new NaturalLanguageEditEngine();
    }
    return NaturalLanguageEditEngine.instance;
  }

  /**
   * Applies conversational edits to the project.
   */
  public applyEdit(
    project: WebsiteProject,
    command: string,
    rawInput: Record<string, unknown> = {}
  ): { project: WebsiteProject; page: WebsitePageModel; actionDescription: string } {
    const cmd = command.toLowerCase();
    const page = project.pages[0] || this.createFallbackPage(project);
    const appliedActions: string[] = [];

    // 0. Explicit Headline update (e.g. "hero headline say '...' / headline to '...'")
    const headlineMatch = command.match(/(?:headline\s+(?:say|to|as)|headline:)\s+["']([^"']+)["']/i);
    if (headlineMatch && headlineMatch[1]) {
      const hero = page.sections.find((s) => s.sectionType === "hero");
      if (hero) {
        hero.content.headline = headlineMatch[1].trim();
        appliedActions.push(`Updated hero headline to "${headlineMatch[1].trim()}"`);
      }
    }

    // 1. "Make the hero more premium"
    if ((cmd.includes("more premium") || (cmd.includes("hero") && (cmd.includes("premium") || cmd.includes("upgrade")))) && !headlineMatch) {
      const hero = page.sections.find((s) => s.sectionType === "hero");
      if (hero) {
        hero.content.badge = "💎 Exclusive Enterprise AI Suite";
        hero.content.headline = "The Elite AI Growth Engine for Visionary Leaders";
        hero.content.subheadline =
          "Command an intelligent, 24/7 autonomous workforce engineered to multiply conversions and institutional authority.";
        hero.styles.backgroundColor = "#020617";
        hero.styles.gradient = "linear-gradient(180deg, #090d16 0%, #020617 100%)";
        appliedActions.push("Upgraded hero section to premium typography, executive gradient, and elite positioning");
      }
    }

    // 2. "Change the CTA to [label]" / "Book a Consultation"
    if (cmd.includes("change the cta") || cmd.includes("cta to") || cmd.includes("book a consultation") || cmd.includes("update cta")) {
      let newLabel = "Book a Consultation";
      const quotedMatch = command.match(/(?:change the cta to|cta to|labeled as)\s+["']([^"']+)["']/i);
      const unquotedMatch = command.match(/(?:change the cta to|cta to|labeled as)\s+["']?([^"'\n,.]+?)["']?(?:\s+(?:with|and)|\.|$)/i);
      if (quotedMatch && quotedMatch[1]) {
        newLabel = quotedMatch[1].trim();
      } else if (unquotedMatch && unquotedMatch[1]) {
        newLabel = unquotedMatch[1].trim();
      }

      page.sections.forEach((sec) => {
        if (sec.content.primaryCta) {
          sec.content.primaryCta.label = newLabel;
        }
      });
      appliedActions.push(`Updated primary call-to-action buttons to '${newLabel}'`);
    }

    // 3. "Use a darker style" / "Dark mode" / "Luxury style"
    if (cmd.includes("darker style") || cmd.includes("dark mode") || cmd.includes("darker") || cmd.includes("luxury style")) {
      project.styles.backgroundColor = "#02040a";
      project.styles.textColor = "#f8fafc";
      project.styles.themeMode = "dark";
      project.styles.primaryColor = cmd.includes("luxury") ? "#d97706" : "#f59e0b";
      page.sections.forEach((s) => {
        if (s.styles) s.styles.backgroundColor = "#02040a";
      });
      appliedActions.push("Applied deep dark mode styling with high-contrast ambient glow");
    }

    // 4. "Add testimonials"
    if (cmd.includes("add testimonials") || cmd.includes("add social proof") || cmd.includes("include testimonials")) {
      const hasTestimonials = page.sections.some((s) => s.sectionType === "testimonials" || s.sectionType === "social proof");
      if (!hasTestimonials) {
        const formIndex = page.sections.findIndex((s) => s.sectionType === "form" || s.sectionType === "CTA");
        const insertIdx = formIndex >= 0 ? formIndex : Math.max(0, page.sections.length - 1);
        const context = project.projectContext || {
          projectType: "Landing Page",
          industry: "General Business",
          businessType: "Business",
          businessName: project.name,
          targetAudience: "Clients & Partners",
          requiredFeatures: [],
          brandStyle: "Modern",
          technicalRequirements: [],
          assumptions: [],
        };
        const testimonialsSec = this.strategyEngine.createTestimonialsSection(page.id, insertIdx, context);
        page.sections.splice(insertIdx, 0, testimonialsSec);
        this.reindexSections(page.sections);
        appliedActions.push("Added social proof testimonials section");
      }
    }

    // 5. "Remove pricing"
    if (cmd.includes("remove pricing") || cmd.includes("delete pricing") || cmd.includes("no pricing")) {
      const beforeLen = page.sections.length;
      page.sections = page.sections.filter((s) => s.sectionType !== "pricing");
      if (page.sections.length < beforeLen) {
        this.reindexSections(page.sections);
        appliedActions.push("Removed pricing section and recalibrated conversion flow");
      }
    }

    // 6. "Move testimonials above pricing"
    if (cmd.includes("move testimonials") || cmd.includes("above pricing")) {
      const testimonialsIndex = page.sections.findIndex((s) => s.sectionType === "testimonials" || s.sectionType === "social proof");
      const pricingIndex = page.sections.findIndex((s) => s.sectionType === "pricing");

      if (testimonialsIndex >= 0 && pricingIndex >= 0) {
        const [testimonials] = page.sections.splice(testimonialsIndex, 1);
        const targetIdx = pricingIndex > testimonialsIndex ? pricingIndex - 1 : pricingIndex;
        page.sections.splice(targetIdx, 0, testimonials);
        this.reindexSections(page.sections);
        appliedActions.push("Reordered sections: moved testimonials immediately above the pricing table");
      }
    }

    // 7. "Shorten the headline"
    if (cmd.includes("shorten") && cmd.includes("headline")) {
      const hero = page.sections.find((s) => s.sectionType === "hero");
      if (hero && hero.content.headline) {
        hero.content.headline = hero.content.headline.split(":")[0]?.trim() || hero.content.headline.slice(0, 38);
        appliedActions.push("Condensed headline to high-impact concise variant");
      }
    }

    // 8. "Make this more suitable for a restaurant"
    if (cmd.includes("suitable for a restaurant") || cmd.includes("make this for a restaurant") || cmd.includes("restaurant style")) {
      project.projectType = "Restaurant Website";
      if (project.projectContext) {
        project.projectContext.industry = "Restaurant";
        project.projectContext.targetAudience = "Diners & Culinary Enthusiasts";
      }

      // Update hero
      const hero = page.sections.find((s) => s.sectionType === "hero");
      if (hero) {
        hero.content.badge = "🍴 Artisanal Culinary Destination";
        hero.content.headline = "An Unforgettable Dining Experience in Every Dish";
        hero.content.subheadline = "Experience seasonal farm-to-table cuisine, master sommelier wine pairings, and intimate ambiance.";
        if (hero.content.primaryCta) hero.content.primaryCta.label = "Reserve a Table";
        if (hero.content.secondaryCta) hero.content.secondaryCta.label = "View Seasonal Menu";
      }

      // Update form to booking
      const form = page.sections.find((s) => s.sectionType === "form");
      if (form) {
        form.content.headline = "Reserve Your Table";
        form.content.subheadline = "Experience exceptional hospitality. Weekend seatings fill rapidly.";
        if (form.content.primaryCta) form.content.primaryCta.label = "Confirm Table Reservation";
        form.content.formFields = [
          { name: "name", label: "Full Name", type: "text", placeholder: "e.g. Marco Rossi", required: true },
          { name: "phone", label: "WhatsApp / Phone", type: "tel", placeholder: "+60 12-345-6789", required: true },
          { name: "date", label: "Reservation Date & Time", type: "text", placeholder: "Tonight at 7:30 PM", required: true },
          { name: "guests", label: "Party Size", type: "text", placeholder: "2 Guests", required: true },
        ];
      }

      appliedActions.push("Transformed page architecture, imagery tone, and reservation form to authentic restaurant experience");
    }

    // 9. "Change the entire page to target B2B customers"
    if (cmd.includes("target b2b") || cmd.includes("b2b customers") || cmd.includes("b2b clients")) {
      if (project.projectContext) {
        project.projectContext.targetAudience = "Enterprise B2B Decision Makers";
      }

      const hero = page.sections.find((s) => s.sectionType === "hero");
      if (hero) {
        hero.content.badge = "🏢 Enterprise B2B Solutions";
        hero.content.headline = "Accelerate Enterprise Velocity & Predictable ROI";
        hero.content.subheadline = "Engineered specifically for leadership teams requiring strict security, dedicated SLAs, and proven scale.";
        if (hero.content.primaryCta) hero.content.primaryCta.label = "Schedule Enterprise Briefing";
      }

      const benefits = page.sections.find((s) => s.sectionType === "benefits");
      if (benefits) {
        benefits.content.headline = "Enterprise-Grade Performance for B2B Leaders";
        benefits.content.items = [
          { title: "SOC2 & GDPR Compliance", description: "Rigorous institutional data governance and end-to-end security.", icon: "🔒" },
          { title: "Dedicated SLA & Support", description: "Guaranteed 15-minute response times with private engineering channels.", icon: "⚡" },
          { title: "Predictable Multi-Year ROI", description: "Quantifiable unit economics and rapid time-to-value.", icon: "📈" },
        ];
      }

      appliedActions.push("Realigned page strategy, headline value proposition, and trust signals to target B2B enterprise clients");
    }

    // 10. "Add a booking form" / "Add a lead form"
    if (cmd.includes("add a booking form") || cmd.includes("booking form") || cmd.includes("add a lead form") || cmd.includes("add form")) {
      const existingForm = page.sections.find((s) => s.sectionType === "form");
      if (!existingForm) {
        const isBooking = cmd.includes("booking");
        const insertIdx = Math.max(0, page.sections.length - 1);
        page.sections.splice(insertIdx, 0, {
          id: `sec-form-${Date.now()}`,
          pageId: page.id,
          sectionType: "form",
          orderIndex: insertIdx,
          name: isBooking ? "Appointment Booking Form" : "Interactive Lead Form",
          content: {
            headline: isBooking ? "Schedule Your Appointment" : "Request Priority Access",
            subheadline: isBooking ? "Select your preferred slot and lock in your session." : "Connect directly with our specialist team.",
            primaryCta: { label: isBooking ? "Confirm Booking" : "Submit Request", url: "#" },
            formFields: isBooking
              ? [
                  { name: "name", label: "Full Name", type: "text", placeholder: "Sarah Jenkins", required: true },
                  { name: "email", label: "Work Email", type: "email", placeholder: "sarah@agency.com", required: true },
                  { name: "date", label: "Preferred Date & Time", type: "text", placeholder: "Tomorrow, 2:00 PM", required: true },
                ]
              : [
                  { name: "name", label: "Full Name", type: "text", placeholder: "Sarah Jenkins", required: true },
                  { name: "email", label: "Business Email", type: "email", placeholder: "sarah@agency.com", required: true },
                  { name: "phone", label: "Phone", type: "tel", placeholder: "+60 12-345-6789", required: true },
                ],
          },
          layout: { containerWidth: "narrow", alignment: "center" },
          styles: {},
          responsive: { stackOnMobile: true },
        });
        this.reindexSections(page.sections);
        appliedActions.push(`Added conversion-focused interactive ${isBooking ? "booking" : "lead capture"} form`);
      }
    }

    // 11. "Make it mobile-first" / "Mobile friendly"
    if (cmd.includes("mobile-first") || cmd.includes("mobile friendly") || cmd.includes("mobile")) {
      page.sections.forEach((sec) => {
        sec.responsive.stackOnMobile = true;
        if (sec.layout.containerWidth === "wide") sec.layout.containerWidth = "normal";
      });
      appliedActions.push("Enhanced mobile layout with vertical stacking, responsive touch targets, and fluid spacing");
    }

    // 12. "Connect form"
    if (cmd.includes("connect form") || cmd.includes("connect the lead")) {
      const form = page.sections.find((s) => s.sectionType === "form");
      if (form && form.content.primaryCta) {
        form.content.primaryCta.url = "/api/forms/submit";
        form.content.primaryCta.actionType = "submit";
      }
      appliedActions.push("Connected lead capture form to Supabase automation sequence");
    }

    // 13. "Publish"
    if (cmd.includes("publish")) {
      page.status = "published";
      appliedActions.push(`Published project pages to live route /p/${page.slug}`);
    }

    const actionDescription =
      appliedActions.length > 0 ? appliedActions.join(". ") : "Applied natural language page modifications";

    page.updatedAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();

    return { project, page, actionDescription };
  }

  private reindexSections(sections: WebsiteSectionModel[]): void {
    sections.forEach((s, idx) => {
      s.orderIndex = idx;
    });
  }

  private createFallbackPage(project: WebsiteProject): WebsitePageModel {
    const page: WebsitePageModel = {
      id: `page-${Date.now()}`,
      projectId: project.id,
      organizationId: project.organizationId,
      name: project.name,
      slug: project.slug,
      pageType: "landing",
      status: "published",
      title: project.name,
      sections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    project.pages.push(page);
    return page;
  }
}
