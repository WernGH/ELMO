/**
 * ELMO Phase 3 — Web Project Engine (WebProjectEngine)
 *
 * Industry-Agnostic Project Understanding & Classification Layer.
 * Evaluates user requests, conversation context, and Company Brain
 * to produce rich, structured project specifications without hard-coded industry defaults.
 *
 * Strict Priority:
 * USER EXPLICIT REQUEST > COMPANY BRAIN > CONVERSATION CONTEXT > RELEVANT MEMORY > GENERIC FALLBACK
 * (NEVER defaults to property / real-estate).
 */

import {
  AgentMessage,
  ProjectContext,
  ProjectType,
  BrandStyleDirection,
} from "../types/agentic.types";
import { ElmoMemoryService } from "@/services/elmo-memory.service";

export class WebProjectEngine {
  private static instance: WebProjectEngine;
  private memoryService: ElmoMemoryService;

  private constructor() {
    this.memoryService = ElmoMemoryService.getInstance();
  }

  public static getInstance(): WebProjectEngine {
    if (!WebProjectEngine.instance) {
      WebProjectEngine.instance = new WebProjectEngine();
    }
    return WebProjectEngine.instance;
  }

  /**
   * Evaluates input, context, and company memory to produce a structured ProjectContext.
   */
  public async analyzeAndClassify(message: AgentMessage): Promise<ProjectContext> {
    const rawTask = message.task || "";
    const rawInput = (message.input?.message as string) || (message.input?.topic as string) || "";
    const combinedPrompt = `${rawTask} ${rawInput}`.trim();

    const orgId = (message.context?.organizationId as string) || "default-org";
    const userId = (message.context?.userId as string) || "00000000-0000-0000-0000-000000000001";

    const assumptions: string[] = [];

    // 1. Resolve Industry with Priority Hierarchy
    // Priority: Explicit User Input > Company Brain > Context > Generic
    const explicitIndustry = this.detectExplicitIndustry(combinedPrompt);
    let industry = "";
    let businessName = (message.input?.businessName as string) || "";
    let companyBrainAudience = "";
    let companyBrainOffer = "";

    if (explicitIndustry) {
      industry = explicitIndustry;
    } else {
      // Check Company Brain memory
      try {
        const relevantMemories = await this.memoryService.getRelevantMemoriesForContext(
          userId,
          orgId,
          "business identity industry core offer target audience",
          5
        );

        for (const mem of relevantMemories) {
          if (mem.entity_type === "business_identity" || mem.category === "business") {
            const detectedFromBrain = this.detectExplicitIndustry(mem.content);
            if (detectedFromBrain && !industry) {
              industry = detectedFromBrain;
            }
            if (!businessName && mem.title) {
              businessName = mem.title;
            }
          }
          if (mem.entity_type === "audience" && !companyBrainAudience) {
            companyBrainAudience = mem.content;
          }
          if (mem.entity_type === "core_offer" && !companyBrainOffer) {
            companyBrainOffer = mem.content;
          }
        }
      } catch {
        // Safe fallback if memory unavailable
      }

      if (!industry) {
        // Try context
        if (message.context?.industry) {
          industry = String(message.context.industry);
        } else {
          industry = "General Business";
          assumptions.push("No explicit industry provided or found in Company Brain; assuming modern professional business.");
        }
      }
    }

    if (!businessName) {
      const bizMatch = combinedPrompt.match(/(?:for|about)\s+((?:Company\s+[A-Z0-9]+|[A-Z][a-zA-Z0-9]+)(?:\s+[A-Za-z0-9&'-]+){1,4})/);
      if (bizMatch && bizMatch[1]) {
        const candidate = bizMatch[1].trim();
        const candLower = candidate.toLowerCase();
        if (!candLower.startsWith("my ") && !candLower.startsWith("our ") && !candLower.includes("landing page") && !candLower.includes("website")) {
          businessName = candidate;
        }
      }
    }

    if (!businessName) {
      businessName = (message.context?.organizationName as string) || `${industry} Pro`;
    }

    // 2. Classify Project Type
    const projectType = this.classifyProjectType(combinedPrompt, (message.input?.projectType as ProjectType));

    // 3. Resolve Target Audience
    let targetAudience = (message.input?.targetAudience as string) || "";
    if (!targetAudience) {
      const explicitAudience = this.detectExplicitAudience(combinedPrompt);
      if (explicitAudience) {
        targetAudience = explicitAudience;
      } else if (companyBrainAudience) {
        targetAudience = companyBrainAudience;
      } else {
        targetAudience = this.getDefaultAudienceForIndustry(industry);
        assumptions.push(`Target audience inferred based on ${industry} industry profile.`);
      }
    }

    // 4. Resolve Offer & Product/Service
    let offer = (message.input?.offer as string) || companyBrainOffer;
    if (!offer) {
      offer = this.getDefaultOfferForIndustry(industry, targetAudience);
      assumptions.push(`Core offer formulated for ${industry} targeting ${targetAudience}.`);
    }

    // 5. Resolve Brand Style Direction
    const brandStyle = this.detectBrandStyle(combinedPrompt, industry);

    // 6. Resolve Primary & Secondary CTAs
    const { primaryCTA, secondaryCTA } = this.resolveCallToActions(combinedPrompt, industry, projectType);

    // 7. Resolve Campaign & Conversion Goals
    let conversionGoal = (message.input?.conversionGoal as string) || "";
    if (!conversionGoal) {
      if (projectType.includes("Lead") || projectType.includes("Landing")) conversionGoal = "Lead Capture & Consultation Request";
      else if (projectType.includes("Sales") || projectType.includes("E-commerce")) conversionGoal = "Direct Purchase / Order";
      else if (projectType.includes("Booking") || industry === "Restaurant") conversionGoal = "Table / Appointment Reservation";
      else if (projectType.includes("Application") || projectType.includes("Dashboard") || projectType.includes("CRM")) conversionGoal = "User Onboarding & Task Completion";
      else conversionGoal = "Inquiry & Discovery Call";
    }

    // 8. Technical Requirements & Features
    const requiredFeatures = this.determineRequiredFeatures(projectType, industry, combinedPrompt);
    const technicalRequirements = [
      "Responsive layout (Desktop, Tablet, Mobile)",
      "Accessible HTML5 semantics & ARIA controls",
      "Tailwind CSS styling tokens",
      "Interactive client controls & state validation",
      "Zero console runtime errors",
    ];
    if (projectType.includes("Application") || projectType.includes("Dashboard") || projectType.includes("CRM")) {
      technicalRequirements.push("Interactive data grid with live filter/search", "Stat KPI cards", "Action modal dialogs");
    }

    return {
      projectType,
      industry,
      businessType: `${industry} Business`,
      businessName,
      targetAudience,
      trafficSource: (message.input?.trafficSource as string) || "Multi-channel inbound (Organic, Social, Direct)",
      campaignGoal: (message.input?.campaignGoal as string) || `Acquire qualified ${targetAudience} customers`,
      conversionGoal,
      offer,
      productOrService: offer,
      pricePosition: (message.input?.pricePosition as string) || (brandStyle === "Luxury" || brandStyle === "Premium" ? "Premium / High-Value" : "Value-Competitive"),
      awarenessLevel: (message.input?.awarenessLevel as string) || "Solution Aware",
      primaryCTA,
      secondaryCTA,
      requiredFeatures,
      brandStyle,
      technicalRequirements,
      assumptions,
    };
  }

  /**
   * Detects explicit industry from text prompt.
   */
  public detectExplicitIndustry(text: string): string | null {
    const t = text.toLowerCase();

    if (t.includes("restaurant") || t.includes("cafe") || t.includes("bistro") || t.includes("dining") || t.includes("food") || t.includes("bakery") || t.includes("makanan")) {
      return "Restaurant";
    }
    if (t.includes("property agent") || t.includes("real estate") || t.includes("hartanah") || t.includes("realtor") || t.includes("housing")) {
      return "Property";
    }
    if (t.includes("insurance") || t.includes("takaful") || t.includes("insurans")) {
      return "Insurance";
    }
    if (t.includes("finance") || t.includes("financial") || t.includes("wealth") || t.includes("accounting") || t.includes("tax") || t.includes("invest")) {
      return "Finance";
    }
    if (t.includes("healthcare") || t.includes("clinic") || t.includes("dental") || t.includes("dentist") || t.includes("doctor") || t.includes("medical") || t.includes("hospital")) {
      return "Healthcare";
    }
    if (t.includes("fitness") || t.includes("gym") || t.includes("workout") || t.includes("trainer") || t.includes("crossfit") || t.includes("yoga")) {
      return "Fitness";
    }
    if (t.includes("coaching") || t.includes("coach") || t.includes("mentor") || t.includes("life coach")) {
      return "Coaching";
    }
    if (t.includes("consulting") || t.includes("consultant") || t.includes("advisory") || t.includes("agency")) {
      return "Consulting";
    }
    if (t.includes("education") || t.includes("school") || t.includes("course") || t.includes("academy") || t.includes("tutoring") || t.includes("university")) {
      return "Education";
    }
    if (t.includes("saas") || t.includes("software as a service") || t.includes("cloud app") || t.includes("dev tool")) {
      return "SaaS";
    }
    if (
      t.includes("ecommerce") ||
      t.includes("e-commerce") ||
      t.includes("online store") ||
      t.includes("retail") ||
      t.includes("clothing") ||
      t.includes("shop") ||
      t.includes("watch") ||
      t.includes("watches") ||
      t.includes("timepiece") ||
      t.includes("timepieces") ||
      t.includes("jewelry")
    ) {
      return "E-commerce";
    }
    if (t.includes("legal") || t.includes("lawyer") || t.includes("attorney") || t.includes("law firm")) {
      return "Legal";
    }
    if (t.includes("event") || t.includes("wedding") || t.includes("conference") || t.includes("summit")) {
      return "Events";
    }
    if (t.includes("travel") || t.includes("tourism") || t.includes("hotel") || t.includes("resort") || t.includes("vacation")) {
      return "Hospitality";
    }
    if (t.includes("technology") || t.includes("tech") || t.includes("ai business") || t.includes("cyber") || t.includes("automation")) {
      return "Technology";
    }
    if (t.includes("manufacturing") || t.includes("factory") || t.includes("industrial")) {
      return "Manufacturing";
    }

    return null;
  }

  /**
   * Classifies project type into one of 24+ supported categories.
   */
  public classifyProjectType(text: string, override?: ProjectType): ProjectType {
    if (override) return override;
    const t = text.toLowerCase();

    // Applications & Portals
    if (t.includes("crm") || t.includes("customer relationship")) return "CRM Interface";
    if (t.includes("dashboard") || t.includes("reporting dashboard") || t.includes("kpi")) return "Dashboard";
    if (t.includes("customer portal") || t.includes("client portal")) return "Customer Portal";
    if (t.includes("admin portal") || t.includes("admin panel") || t.includes("backoffice")) return "Admin Portal";
    if (t.includes("internal tool") || t.includes("business tool")) return "Internal Business Tool";
    if (t.includes("web app") || t.includes("web application") || t.includes("software application")) return "Web Application";

    // Industry-specific websites
    if (t.includes("restaurant") && (t.includes("website") || t.includes("site") || t.includes("menu"))) return "Restaurant Website";
    if ((t.includes("property") || t.includes("real estate")) && (t.includes("website") || t.includes("site"))) return "Property Website";
    if (t.includes("insurance") && (t.includes("website") || t.includes("site"))) return "Insurance Website";
    if (t.includes("coaching") && (t.includes("website") || t.includes("site"))) return "Coaching Website";
    if (t.includes("portfolio") || t.includes("showcase")) return "Portfolio Website";
    if (t.includes("booking") || t.includes("reservation system")) return "Booking Website";
    if (t.includes("membership") || t.includes("community")) return "Membership Website";
    if (t.includes("ecommerce") || t.includes("e-commerce") || t.includes("online store")) return "E-commerce Website";
    if (t.includes("saas") && (t.includes("website") || t.includes("site"))) return "SaaS Marketing Website";
    if (t.includes("corporate") || t.includes("company website")) return "Corporate Website";

    // General websites vs Pages
    if (t.includes("website") || t.includes("multi-page") || t.includes("multi page") || t.includes("site")) return "Business Website";
    if (t.includes("sales page") || t.includes("vsl")) return "Sales Page";
    if (t.includes("lead gen") || t.includes("lead generation") || t.includes("opt-in") || t.includes("optin")) return "Lead Generation Page";
    if (t.includes("product page")) return "Product Page";
    if (t.includes("service page")) return "Service Page";

    return "Landing Page";
  }

  /**
   * Extracts explicit audience if stated in prompt.
   */
  private detectExplicitAudience(text: string): string | null {
    // 1. Direct audience targeting phrases
    const targetingMatch = text.match(/(?:targeting|aimed at|focus on|sasaran)\s+([^.,\n\r]+)/i);
    if (targetingMatch && targetingMatch[1]) {
      const clean = targetingMatch[1].trim();
      if (!clean.toLowerCase().includes("landing page") && !clean.toLowerCase().includes("my business")) {
        return clean.replace(/\b\w/g, (c) => c.toUpperCase());
      }
    }

    // 2. "for <audience>" - but exclude business entity names like "for my restaurant", "for our company", etc.
    const match = text.match(/(?:for)\s+(?!my\b|our\b|a\b|the\b)([a-zA-Z0-9\s&/-]{3,40}?)(?:\s+(?:with|that|who|and|in|\.)|$)/i);
    if (match && match[1]) {
      const clean = match[1].trim();
      const lowerClean = clean.toLowerCase();
      const isBusinessEntity =
        lowerClean.includes("landing page") ||
        lowerClean.includes("website") ||
        lowerClean.includes("bistro") ||
        lowerClean.includes("restaurant") ||
        lowerClean.includes("clinic") ||
        lowerClean.includes("firm") ||
        lowerClean.includes("store") ||
        lowerClean.includes("agency") ||
        lowerClean.includes("business") ||
        lowerClean.includes("company") ||
        lowerClean.includes("watches") ||
        lowerClean.includes("timepieces");

      if (!isBusinessEntity) {
        return clean;
      }
    }
    return null;
  }

  /**
   * Returns reasonable audience defaults by industry.
   */
  public getDefaultAudienceForIndustry(industry: string): string {
    switch (industry) {
      case "Restaurant":
        return "Local Diners & Food Enthusiasts";
      case "Insurance":
        return "Families & Business Owners Seeking Coverage";
      case "Finance":
        return "Investors & High-Net-Worth Individuals";
      case "Healthcare":
        return "Patients Seeking Quality Medical Care";
      case "Fitness":
        return "Health-Conscious Individuals & Athletes";
      case "Coaching":
        return "Ambitious Entrepreneurs & Professionals";
      case "Consulting":
        return "Corporate Executives & Decision Makers";
      case "Education":
        return "Students & Lifelong Learners";
      case "SaaS":
        return "Modern Tech Teams & Business Founders";
      case "E-commerce":
        return "Online Shoppers Seeking Curated Quality";
      case "Property":
        return "Homebuyers, Sellers & Property Investors";
      default:
        return "Forward-Thinking Businesses & Clients";
    }
  }

  /**
   * Returns reasonable offer defaults by industry.
   */
  public getDefaultOfferForIndustry(industry: string, audience: string): string {
    switch (industry) {
      case "Restaurant":
        return "Artisanal Seasonal Tasting Menu & VIP Table Experience";
      case "Insurance":
        return "Comprehensive Policy Review & Tailored Protection Package";
      case "Finance":
        return "Strategic Wealth Blueprint & Portfolio Optimization";
      case "Healthcare":
        return "Personalized Wellness Consultation & Comprehensive Health Audit";
      case "Fitness":
        return "30-Day Total Body Transformation & Guided Coaching Program";
      case "Coaching":
        return "1-on-1 Elite Leadership Accelerator & Scale Framework";
      case "Consulting":
        return "Strategic Diagnostic Audit & Actionable Growth Blueprint";
      case "Education":
        return "Mastery Certification Program with Direct Instructor Support";
      case "SaaS":
        return "Intelligent Cloud Platform with 14-Day Full-Featured Trial";
      case "E-commerce":
        return "Exclusive Limited-Edition Collection with Free Express Delivery";
      case "Property":
        return "Exclusive VIP Property Portfolio & Private Advisory Consultation";
      default:
        return `High-Impact Solutions Engineered for ${audience}`;
    }
  }

  /**
   * Determines visual brand direction from tone or industry.
   */
  private detectBrandStyle(text: string, industry: string): BrandStyleDirection {
    const t = text.toLowerCase();
    if (t.includes("minimal")) return "Minimal";
    if (t.includes("luxury")) return "Luxury";
    if (t.includes("premium")) return "Premium";
    if (t.includes("futuristic")) return "Futuristic";
    if (t.includes("editorial")) return "Editorial";
    if (t.includes("bold")) return "Bold";
    if (t.includes("playful")) return "Playful";
    if (t.includes("technical")) return "Technical";
    if (t.includes("corporate")) return "Corporate";

    // Industry defaults
    switch (industry) {
      case "Finance":
      case "Insurance":
      case "Legal":
        return "Corporate";
      case "Restaurant":
      case "Hospitality":
        return "Premium";
      case "SaaS":
      case "Technology":
        return "Modern";
      case "Fitness":
        return "Bold";
      case "Coaching":
        return "Conversion-focused";
      default:
        return "Modern";
    }
  }

  /**
   * Resolves appropriate CTAs based on industry and project type.
   */
  private resolveCallToActions(
    text: string,
    industry: string,
    projectType: ProjectType
  ): { primaryCTA: { label: string; url: string; actionType: string }; secondaryCTA: { label: string; url: string } } {
    // Check explicit CTA in prompt
    const ctaMatch = text.match(/(?:cta|button)\s+(?:to|saying|labeled|as)\s+["']?([^"',.]{3,30})["']?/i);
    if (ctaMatch && ctaMatch[1]) {
      return {
        primaryCTA: { label: ctaMatch[1].trim(), url: "#contact", actionType: "scroll" },
        secondaryCTA: { label: "Learn More", url: "#details" },
      };
    }

    if (industry === "Restaurant") {
      return {
        primaryCTA: { label: "Reserve a Table", url: "#booking", actionType: "modal" },
        secondaryCTA: { label: "View Seasonal Menu", url: "#menu" },
      };
    }

    if (industry === "Insurance" || industry === "Finance") {
      return {
        primaryCTA: { label: "Get Free Quote", url: "#quote", actionType: "scroll" },
        secondaryCTA: { label: "Compare Plans", url: "#comparison" },
      };
    }

    if (industry === "Fitness") {
      return {
        primaryCTA: { label: "Claim Free 7-Day Pass", url: "#join", actionType: "scroll" },
        secondaryCTA: { label: "Explore Programs", url: "#programs" },
      };
    }

    if (industry === "SaaS" || projectType === "SaaS Marketing Website") {
      return {
        primaryCTA: { label: "Start Free 14-Day Trial", url: "#signup", actionType: "link" },
        secondaryCTA: { label: "Book a Demo", url: "#demo" },
      };
    }

    if (projectType.includes("Application") || projectType.includes("Dashboard") || projectType.includes("CRM")) {
      return {
        primaryCTA: { label: "Open Workspace", url: "#app", actionType: "link" },
        secondaryCTA: { label: "Export Report", url: "#export" },
      };
    }

    if (projectType.includes("Booking")) {
      return {
        primaryCTA: { label: "Schedule Appointment", url: "#schedule", actionType: "modal" },
        secondaryCTA: { label: "View Availability", url: "#calendar" },
      };
    }

    if (industry === "Coaching" || industry === "Consulting") {
      return {
        primaryCTA: { label: "Apply for Consultation", url: "#apply", actionType: "scroll" },
        secondaryCTA: { label: "Review Case Studies", url: "#case-studies" },
      };
    }

    return {
      primaryCTA: { label: "Get Started Free", url: "#contact", actionType: "scroll" },
      secondaryCTA: { label: "Explore Overview", url: "#features" },
    };
  }

  /**
   * Determines required features based on project type and industry.
   */
  private determineRequiredFeatures(projectType: ProjectType, industry: string, text: string): string[] {
    const features: string[] = ["Mobile-responsive design", "SEO meta tags"];

    if (projectType.includes("Lead") || projectType.includes("Landing") || projectType.includes("Sales")) {
      features.push("Interactive lead capture form", "Customer social proof showcase", "Conversion value hierarchy");
    }

    if (industry === "Restaurant") {
      features.push("Interactive reservation form", "Digital culinary menu showcase", "Location & operating hours");
    }

    if (industry === "Insurance" || industry === "Finance") {
      features.push("Coverage comparison table", "Trust & regulatory credentials", "FAQ objection handling");
    }

    if (industry === "SaaS") {
      features.push("Tiered pricing matrix", "Interactive feature grid", "Security & SOC2 credentials");
    }

    if (projectType.includes("Application") || projectType.includes("Dashboard") || projectType.includes("CRM")) {
      features.push("Metric KPI stat cards", "Searchable data table with filter", "Interactive status drawer / modal");
    }

    return features;
  }
}
