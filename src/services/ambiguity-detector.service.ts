/**
 * ELMO Phase 1 — Ambiguity Detector Service (AmbiguityDetectorService)
 *
 * Evaluates whether sufficient context exists to fulfill a request safely.
 * Enforces the strict priority hierarchy:
 * USER EXPLICIT REQUEST > CURRENT COMPANY BRAIN > CURRENT CONVERSATION > RELEVANT MEMORY > GENERIC FALLBACK
 *
 * CRITICAL RULE: NEVER silently invents a business industry or defaults to property!
 */

import { ExtractedIntentEntities } from "@/types/elmo-request.types";

export interface ContextResolutionSource {
  resolvedIndustry?: string;
  resolvedBusiness?: string;
  resolvedAudience?: string;
  resolutionSource: "explicit_request" | "company_brain" | "conversation_continuity" | "semantic_memory" | "generic_fallback";
  isAmbiguous: boolean;
  clarificationQuestion?: string;
}

export interface AmbiguityEvaluationParams {
  message: string;
  entities: ExtractedIntentEntities;
  companyBrainContext?: {
    businessIdentity?: string;
    targetAudience?: string;
    industry?: string;
    memories?: Array<{ category?: string; content: string; entity_type?: string }>;
  };
  conversationContinuity?: {
    activeIndustry?: string;
    activeTopic?: string;
    activeTargetAudience?: string;
  };
  semanticMemories?: Array<{ category?: string; content: string }>;
}

export class AmbiguityDetectorService {
  private static instance: AmbiguityDetectorService;

  private constructor() {}

  public static getInstance(): AmbiguityDetectorService {
    if (!AmbiguityDetectorService.instance) {
      AmbiguityDetectorService.instance = new AmbiguityDetectorService();
    }
    return AmbiguityDetectorService.instance;
  }

  /**
   * Resolves business context according to strict hierarchy:
   * USER EXPLICIT REQUEST > CURRENT COMPANY BRAIN > CURRENT CONVERSATION > RELEVANT MEMORY > GENERIC FALLBACK
   */
  public resolveContextHierarchy(params: AmbiguityEvaluationParams): ContextResolutionSource {
    const raw = params.message.trim();
    const lower = raw.toLowerCase();

    // 1. PRIORITY 1: USER EXPLICIT REQUEST
    if (params.entities.industry || params.entities.business) {
      return {
        resolvedIndustry: params.entities.industry,
        resolvedBusiness: params.entities.business,
        resolvedAudience: params.entities.audience,
        resolutionSource: "explicit_request",
        isAmbiguous: false,
      };
    }

    // 2. PRIORITY 2: CURRENT COMPANY BRAIN
    if (params.companyBrainContext) {
      const brainInd = params.companyBrainContext.industry;
      const brainBiz = params.companyBrainContext.businessIdentity;
      const brainAud = params.companyBrainContext.targetAudience;

      // Extract from memory records if available
      let memoryIndustry: string | undefined;
      if (params.companyBrainContext.memories) {
        for (const m of params.companyBrainContext.memories) {
          const content = m.content.toLowerCase();
          if (content.includes("insurance") || content.includes("insurans")) memoryIndustry = "Insurance";
          else if (content.includes("restaurant") || content.includes("restoran") || content.includes("cafe")) memoryIndustry = "Restaurant";
          else if (content.includes("coaching") || content.includes("mentor")) memoryIndustry = "Coaching";
          else if (content.includes("saas") || content.includes("software")) memoryIndustry = "SaaS";
          else if (content.includes("ecommerce") || content.includes("online store")) memoryIndustry = "Ecommerce";
          else if (content.includes("agency") || content.includes("agensi")) memoryIndustry = "Agency";
          else if (content.includes("property") || content.includes("real estate") || content.includes("hartanah")) memoryIndustry = "Property";
          if (memoryIndustry) break;
        }
      }

      const finalBrainInd = brainInd || memoryIndustry;
      if (finalBrainInd || brainBiz) {
        return {
          resolvedIndustry: finalBrainInd,
          resolvedBusiness: brainBiz || (finalBrainInd ? `${finalBrainInd} business` : undefined),
          resolvedAudience: brainAud,
          resolutionSource: "company_brain",
          isAmbiguous: false,
        };
      }
    }

    // 3. PRIORITY 3: CURRENT CONVERSATION CONTINUITY
    if (params.conversationContinuity) {
      const contInd = params.conversationContinuity.activeIndustry;
      const contTopic = params.conversationContinuity.activeTopic;
      const contAud = params.conversationContinuity.activeTargetAudience;

      if (contInd || contTopic) {
        return {
          resolvedIndustry: contInd,
          resolvedBusiness: contTopic,
          resolvedAudience: contAud,
          resolutionSource: "conversation_continuity",
          isAmbiguous: false,
        };
      }
    }

    // 4. PRIORITY 4: RELEVANT MEMORY (Semantic search)
    if (params.semanticMemories && params.semanticMemories.length > 0) {
      for (const sm of params.semanticMemories) {
        const smText = sm.content.toLowerCase();
        let smInd: string | undefined;
        if (smText.includes("insurance")) smInd = "Insurance";
        else if (smText.includes("restaurant") || smText.includes("cafe")) smInd = "Restaurant";
        else if (smText.includes("coaching")) smInd = "Coaching";
        else if (smText.includes("saas")) smInd = "SaaS";
        else if (smText.includes("ecommerce")) smInd = "Ecommerce";
        else if (smText.includes("agency")) smInd = "Agency";
        else if (smText.includes("property") || smText.includes("real estate")) smInd = "Property";

        if (smInd) {
          return {
            resolvedIndustry: smInd,
            resolvedBusiness: `${smInd} business`,
            resolutionSource: "semantic_memory",
            isAmbiguous: false,
          };
        }
      }
    }

    // 5. PRIORITY 5: GENERIC FALLBACK (No guessing, no default to property)
    // Check if the user is asking for a generative/actionable build request that requires business domain
    const isBuildRequest = /\b(create|build|make|bina|buat|launch|set up)\b.*\b(website|landing page|funnel|campaign|portal|crm|app)\b/i.test(lower);

    if (isBuildRequest) {
      return {
        resolutionSource: "generic_fallback",
        isAmbiguous: true,
        clarificationQuestion:
          "To design the right solution for you, could you please clarify what business or industry this is for, and who your primary target audience will be?",
      };
    }

    return {
      resolutionSource: "generic_fallback",
      isAmbiguous: false,
    };
  }
}
