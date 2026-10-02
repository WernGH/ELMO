/**
 * COAI B.O.S v2 — Tenant Brand & Business Profile Seeder (BosBrandConfigService)
 *
 * Ported from B.O.S v2 tenant brand staging doctrine (`tenant-brand-config-staged.md`).
 * Automatically derives:
 * 1. Accessible, high-contrast design system palette tokens (Primary, Accent, Glow).
 * 2. Tone-of-Voice & messaging guidelines tailored by industry.
 * 3. Structured 7-dimension BusinessProfile for ELMO's CompanyBrainService.
 * 4. Foundational operational SOPs & common objection handbooks.
 */

import {
  BusinessProfile,
  CustomerSegmentProfile,
  MarketingStrategyProfile,
  SalesProcessProfile,
  OperationsProfile,
} from "@/types/company-brain.types";
import { CompanyBrainService } from "../company-brain.service";
import { ElmoMemoryService } from "../elmo-memory.service";

export interface BosPaletteTokens {
  primary: string;
  accent: string;
  background: string;
  card: string;
  border: string;
  glow: string;
}

export interface BosBrandSynthesisParams {
  businessName: string;
  industry: string;
  location?: string;
  personality?: "consultative" | "bold" | "premium" | "casual";
  targetMarket?: string;
}

const INDUSTRY_PALETTES: Record<string, BosPaletteTokens> = {
  saas: {
    primary: "#6366f1", // Indigo
    accent: "#06b6d4", // Cyan
    background: "#080b11",
    card: "rgba(18, 24, 38, 0.8)",
    border: "rgba(99, 102, 241, 0.25)",
    glow: "rgba(99, 102, 241, 0.4)",
  },
  fintech: {
    primary: "#0ea5e9", // Sky
    accent: "#10b981", // Emerald
    background: "#050b14",
    card: "rgba(10, 22, 38, 0.8)",
    border: "rgba(14, 165, 233, 0.25)",
    glow: "rgba(16, 185, 129, 0.35)",
  },
  restaurant: {
    primary: "#f97316", // Orange
    accent: "#eab308", // Yellow
    background: "#0c0806",
    card: "rgba(28, 18, 14, 0.8)",
    border: "rgba(249, 115, 22, 0.25)",
    glow: "rgba(249, 115, 22, 0.35)",
  },
  property: {
    primary: "#14b8a6", // Teal
    accent: "#3b82f6", // Blue
    background: "#040d0e",
    card: "rgba(8, 26, 28, 0.8)",
    border: "rgba(20, 184, 166, 0.25)",
    glow: "rgba(20, 184, 166, 0.35)",
  },
  default: {
    primary: "#6366f1",
    accent: "#8b5cf6",
    background: "#0a0d14",
    card: "rgba(18, 22, 34, 0.8)",
    border: "rgba(255, 255, 255, 0.08)",
    glow: "rgba(99, 102, 241, 0.3)",
  },
};

export class BosBrandConfigService {
  private static instance: BosBrandConfigService;

  private constructor() {}

  public static getInstance(): BosBrandConfigService {
    if (!BosBrandConfigService.instance) {
      BosBrandConfigService.instance = new BosBrandConfigService();
    }
    return BosBrandConfigService.instance;
  }

  /**
   * Derives UI color palette tokens based on industry.
   */
  public derivePalette(industry: string): BosPaletteTokens {
    const key = industry.toLowerCase();
    if (key.includes("fintech") || key.includes("finance") || key.includes("bank")) {
      return INDUSTRY_PALETTES.fintech;
    }
    if (key.includes("saas") || key.includes("software") || key.includes("tech")) {
      return INDUSTRY_PALETTES.saas;
    }
    if (key.includes("restaurant") || key.includes("food") || key.includes("dining")) {
      return INDUSTRY_PALETTES.restaurant;
    }
    if (key.includes("property") || key.includes("real estate")) {
      return INDUSTRY_PALETTES.property;
    }
    return INDUSTRY_PALETTES.default;
  }

  /**
   * Synthesizes a structured 7-dimension BusinessProfile conforming to ELMO's CompanyBrain.
   */
  public synthesizeProfile(params: BosBrandSynthesisParams): BusinessProfile {
    const { businessName, industry, location = "Malaysia & Southeast Asia", personality = "consultative" } = params;

    const customerSegments: CustomerSegmentProfile[] = [
      {
        name: `Primary ${industry} Clients`,
        isPrimary: true,
        buyerType: "b2b_sme",
        demographics: `Decision-makers, founders, and department heads in ${location}`,
        primaryProblems: [
          `Manual administrative overhead and fragmented communications`,
          `Unpredictable lead follow-up and customer retention leakage`,
          `High operational staffing costs without automated scaling`,
        ],
        acuteNeeds: [
          `Rapid turnaround time on quotes and customer inquiries`,
          `Seamless automated workflows without technical complexity`,
        ],
      },
    ];

    const marketing: MarketingStrategyProfile = {
      positioning: `${businessName} provides automated, high-efficiency ${industry} operating systems.`,
      coreMessaging: `Empowering modern organizations to operate faster, smarter, and with zero manual friction.`,
      brandVoice: personality === "bold" ? "Bold, disruptive, challenger" : "Consultative, authoritative, reassuring",
      toneGuidelines: [
        "Focus on tangible outcomes (hours saved, conversion lift, error reduction)",
        "Avoid overly technical jargon; speak the language of business operators",
        "Maintain clarity and crisp executive communication",
      ],
      primaryChannels: ["Email Outbound", "LinkedIn", "WhatsApp", "Landing Page Funnels"],
    };

    const sales: SalesProcessProfile = {
      salesProcessOverview: "Initial inquiry -> Qualification -> Interactive Demo / Consultation -> Proposal -> Onboarding",
      leadStages: ["New Inquiry", "Qualified", "Consultation Scheduled", "Proposal Delivered", "Won"],
      commonObjections: [
        {
          objection: "Budget or pricing concerns",
          counterApproach: "Highlight proven 30-day ROI and cost offset against manual staffing hours.",
        },
        {
          objection: "Timing or bandwidth constraints",
          counterApproach: "Emphasize turnkey automated onboarding requiring less than 60 minutes of client effort.",
        },
      ],
    };

    const operations: OperationsProfile = {
      workflows: [
        "Instant lead notification within 60 seconds",
        "Automated multi-touch follow-up sequence",
        "Two-phase arming confirmation before live dispatch",
      ],
      businessRules: [
        "High-risk actions require operator arming confirmation",
        "Zero unsolicited contact without verified exclusion check",
      ],
    };

    return {
      businessName,
      companyName: businessName,
      industry,
      location,
      tagline: `Intelligent ${industry} Operations on Autopilot`,
      description: `${businessName} is an AI-powered enterprise operating system designed for modern ${industry} businesses across ${location}.`,
      customerSegments,
      marketing,
      sales,
      operations,
      productsServices: [
        {
          name: "Core Operational Suite",
          type: "subscription",
          description: "End-to-end automated workforce and client pipeline management.",
        },
      ],
    };
  }

  /**
   * Seeds synthesized brand profile directly into ELMO's CompanyBrainService.
   */
  public async seedOrganization(
    userId: string,
    organizationId: string,
    params: BosBrandSynthesisParams
  ): Promise<{ profile: BusinessProfile; palette: BosPaletteTokens }> {
    const brain = CompanyBrainService.getInstance();
    const memory = ElmoMemoryService.getInstance();

    const profile = this.synthesizeProfile(params);
    const palette = this.derivePalette(params.industry);

    // Save profile into CompanyBrain
    await brain.updateBusinessProfile(userId, organizationId, profile);

    // Record verified brand preferences into ElmoMemoryService
    await memory.createMemory({
      organizationId,
      userId,
      category: "preference",
      title: "B.O.S Brand Voice Directives",
      content: `Tone of voice: ${profile.marketing?.brandVoice}. Primary color: ${palette.primary}. Industry positioning: ${profile.marketing?.positioning}`,
      source: "system",
      importance: "high",
    });

    return { profile, palette };
  }
}
