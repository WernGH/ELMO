/**
 * ELMO Phase 1 — Goal Understanding Service (GoalUnderstandingService)
 *
 * Differentiates between USER MESSAGE and USER GOAL.
 * Extracts:
 * - High-level strategic goal description
 * - Industry & business context
 * - Target audience (or flags it as unknown)
 * - Required capability (analysis vs planning vs action vs information)
 * - Required action (if actionable)
 * - Missing required information
 * - Prevents premature execution when user is only seeking analysis or information.
 */

import { UserGoal, RequiredCapability } from "@/types/user-context.types";
import { ExtractedIntentEntities } from "@/types/elmo-request.types";

export class GoalUnderstandingService {
  private static instance: GoalUnderstandingService;

  private constructor() {}

  public static getInstance(): GoalUnderstandingService {
    if (!GoalUnderstandingService.instance) {
      GoalUnderstandingService.instance = new GoalUnderstandingService();
    }
    return GoalUnderstandingService.instance;
  }

  /**
   * Resolves the user's underlying goal from their message, extracted entities, and context.
   */
  public resolveGoal(
    message: string,
    entities: ExtractedIntentEntities,
    conversationContext?: {
      continuityIndustry?: string;
      continuityTopic?: string;
      continuityAudience?: string;
    }
  ): UserGoal {
    const raw = message.trim();
    const lower = raw.toLowerCase();

    const industry = entities.industry || conversationContext?.continuityIndustry;
    const businessContext = entities.business || (industry ? `${industry} business` : conversationContext?.continuityTopic);
    const targetAudience = entities.audience || entities.targetAudience || conversationContext?.continuityAudience;

    // 1. Diagnose conversion or lead problems
    // Example: "Why are my leads not converting?"
    if (
      /(why are my leads not converting|why (is|are) (my|our) (leads|funnel|traffic) not converting|kenapa leads tak convert|conversion (problem|issue|drop)|low conversion)/i.test(
        lower
      )
    ) {
      return {
        rawMessage: raw,
        goalDescription: "Diagnose conversion problem and identify funnel drop-off causes",
        industry,
        businessContext,
        targetAudience,
        requiredCapability: "analysis",
        requiredAction: "diagnose_conversion_funnel",
        missingInformation: [],
        isActionable: false, // Pure analysis, do not trigger destructive or build actions
        ambiguityDetected: false,
        priority: "high",
      };
    }

    // 2. Analytical inquiries (metrics, performance, traffic)
    if (
      /(how many leads|what is my conversion rate|show me the analytics|prestasi funnel|analisis prestasi|stats for|drop-off rate)/i.test(
        lower
      )
    ) {
      return {
        rawMessage: raw,
        goalDescription: "Analyze operational performance and marketing metrics",
        industry,
        businessContext,
        targetAudience,
        requiredCapability: "analysis",
        requiredAction: "retrieve_performance_metrics",
        missingInformation: [],
        isActionable: false,
        ambiguityDetected: false,
        priority: "medium",
      };
    }

    // 3. Troubleshooting inquiries
    if (
      /(not working|broken|error|fail|gagal|tak jadi|fix this|repair|issue with my|problem with)/i.test(lower) &&
      !/(create|build|make|bina)/i.test(lower)
    ) {
      return {
        rawMessage: raw,
        goalDescription: "Troubleshoot and resolve operational or page issues",
        industry,
        businessContext,
        targetAudience,
        requiredCapability: "troubleshooting",
        requiredAction: "investigate_system_error",
        missingInformation: [],
        isActionable: false,
        ambiguityDetected: false,
        priority: "high",
      };
    }

    // 4. Recommendation / Advisory
    if (
      /^(what (should|can) i improve|give me advice|recommend|cadangkan|suggest|three ways to improve|best practices for)/i.test(
        lower
      )
    ) {
      return {
        rawMessage: raw,
        goalDescription: "Obtain expert strategic recommendations and optimization advice",
        industry,
        businessContext,
        targetAudience,
        requiredCapability: "recommendation",
        missingInformation: [],
        isActionable: false,
        ambiguityDetected: false,
        priority: "medium",
      };
    }

    // 5. Landing Page / Website Creation
    // Example: "Create a landing page for my insurance business."
    if (
      /\b(create|build|make|bina|buat|launch)\b.*\b(landing page|sales page|website|webpage|halaman|laman web)\b/i.test(
        lower
      )
    ) {
      const missing: string[] = [];
      if (!targetAudience) {
        missing.push("target audience");
      }
      if (!entities.offer) {
        missing.push("core offer or value proposition");
      }

      const isBareWebsiteRequest = /^(create a website|build a website|make a website|bina website|buat website)[.!?]?$/i.test(raw);

      return {
        rawMessage: raw,
        goalDescription: `Create a conversion-focused ${entities.page === "website" ? "website" : "landing page"}${industry ? ` for ${industry} business` : ""}`,
        industry,
        businessContext: businessContext || (industry ? `${industry} business` : undefined),
        targetAudience: targetAudience || "Unknown",
        requiredCapability: isBareWebsiteRequest ? "planning" : "action",
        requiredAction: "create_landing_page",
        missingInformation: isBareWebsiteRequest ? ["industry", "target audience", "core offer"] : (missing.length > 0 ? missing : []),
        isActionable: !isBareWebsiteRequest,
        ambiguityDetected: isBareWebsiteRequest && !industry,
        clarificationQuestion: isBareWebsiteRequest && !industry
          ? "To build the right website, what industry or business is this for, and who is your primary target audience?"
          : undefined,
        priority: "high",
      };
    }

    // 6. Funnel Creation
    if (/\b(create|build|make|launch|bina|buatkan)\b.*\b(funnel|lead gen funnel|webinar funnel|sales funnel)\b/i.test(lower)) {
      const missing: string[] = [];
      if (!targetAudience) missing.push("target audience");
      if (!entities.offer) missing.push("lead magnet or primary offer");

      return {
        rawMessage: raw,
        goalDescription: `Build a high-converting ${entities.funnel || "funnel"}${industry ? ` in ${industry}` : ""}`,
        industry,
        businessContext,
        targetAudience: targetAudience || "Unknown",
        requiredCapability: "action",
        requiredAction: "create_funnel",
        missingInformation: missing,
        isActionable: true,
        ambiguityDetected: false,
        priority: "high",
      };
    }

    // 7. General Information / Questions
    if (/^(what (is|are)|how (to|do|does|can)|explain|tell me about|terangkan|jelaskan|apa itu|macam mana)\b/i.test(lower)) {
      return {
        rawMessage: raw,
        goalDescription: "Understand business, technical, or marketing concepts",
        industry,
        businessContext,
        targetAudience,
        requiredCapability: "information",
        missingInformation: [],
        isActionable: false,
        ambiguityDetected: false,
        priority: "low",
      };
    }

    // 8. General Planning / Strategy
    if (/(plan|blueprint|pelan|strategy|strategi|roadmap)\b/i.test(lower)) {
      return {
        rawMessage: raw,
        goalDescription: "Develop strategic operational and marketing roadmap",
        industry,
        businessContext,
        targetAudience,
        requiredCapability: "planning",
        requiredAction: "formulate_strategy_plan",
        missingInformation: [],
        isActionable: false,
        ambiguityDetected: false,
        priority: "medium",
      };
    }

    // Default conversational goal
    return {
      rawMessage: raw,
      goalDescription: "Converse with ELMO executive AI",
      industry,
      businessContext,
      targetAudience,
      requiredCapability: "information",
      missingInformation: [],
      isActionable: false,
      ambiguityDetected: false,
      priority: "low",
    };
  }
}
