/**
 * ELMO Phase 1 — ELMO Intent Service (ElmoIntentService)
 *
 * Semantic Intent Recognition Layer.
 * Avoids simplistic keyword matching and classifies user inputs into:
 * 1. Execution Category: "direct_response" | "action" | "workflow"
 * 2. Structured SaaS & Conversational Intents
 * 3. Extracted Business Entities & Goals
 * 4. Code-Switched & Multilingual Expressions
 */

import { ExecutionCategory, GoalIntentData } from "@/types/elmo-request.types";

export type ElmoSaaSIntent =
  | "greeting"
  | "casual_conversation"
  | "question"
  | "information_request"
  | "funnel_discussion"
  | "funnel_creation"
  | "funnel_modification"
  | "page_creation"
  | "page_modification"
  | "copywriting"
  | "email_creation"
  | "contact_management"
  | "automation_request"
  | "analytics_request"
  | "optimization_request"
  | "planning"
  | "brainstorming"
  | "confirmation"
  | "task_execution"
  | "goal_formulation"
  | "memory_store"
  | "memory_forget"
  | "memory_update"
  | "memory_query"
  | "website_creation"
  | "website_modification"
  | "component_creation"
  | "code_generation"
  | "preview_request";

export interface ExtractedIntentEntities {
  funnelType?: string;
  targetAudience?: string;
  offer?: string;
  goal?: string;
  pageType?: string;
  sectionType?: string;
  topic?: string;
  style?: string;
  responsive?: string;
  contactEmail?: string;
  metricType?: string;
  [key: string]: unknown;
}

export interface IntentAnalysisResult {
  intent: ElmoSaaSIntent;
  executionCategory?: ExecutionCategory;
  confidence: number;
  isComplexTask: boolean;
  requiresAction: boolean;
  requiresPlanning?: boolean;
  entities: ExtractedIntentEntities;
  suggestedTools: string[];
  explanation: string;
  goalData?: GoalIntentData;
  requestedOutcome?: string;
  timeConstraint?: string;
}

export class ElmoIntentService {
  private static instance: ElmoIntentService;

  private constructor() {}

  public static getInstance(): ElmoIntentService {
    if (!ElmoIntentService.instance) {
      ElmoIntentService.instance = new ElmoIntentService();
    }
    return ElmoIntentService.instance;
  }

  /**
   * Analyzes the user's message semantically to resolve business intent,
   * execution category (Direct Response vs Action vs Workflow), and entities.
   */
  public analyzeIntent(message: string, conversationContext?: string): IntentAnalysisResult {
    const raw = message.trim();
    const lower = raw.toLowerCase();

    // =========================================================================
    // 1. Goal Detection (Section 25: Future Goal Engine Interface)
    // =========================================================================
    const goalRegex = /(?:i want to (?:get|reach|hit|achieve|generate)|target(?:ing)?|matlamat(?: kita)?|aiming for|generate)\s+(\d+[\w\s]+?)(?:\s+(this month|this quarter|this week|in \d+ days|by end of \w+|bulan ini|minggu ini))?(?:[.,]|$)/i;
    const goalMatch = raw.match(goalRegex);
    let goalData: GoalIntentData | undefined;
    if (goalMatch && /\d+/.test(goalMatch[1])) {
      goalData = {
        isGoal: true,
        outcome: goalMatch[1].trim(),
        timeConstraint: goalMatch[2]?.trim(),
        requiresPlanning: true,
      };
    }

    // =========================================================================
    // 2. Greetings
    // =========================================================================
    if (
      /^(hi|hello|hey|salam|assalamualaikum|hai|selamat pagi|selamat petang|greetings|hola|bonjour|ciao|你好|早安)/i.test(
        raw
      ) &&
      raw.split(" ").length <= 4
    ) {
      return {
        intent: "greeting",
        executionCategory: "direct_response",
        confidence: 0.95,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities: {},
        suggestedTools: [],
        explanation: "Standard conversational greeting.",
      };
    }

    // =========================================================================
    // 3. Casual chat / check-in
    // =========================================================================
    if (
      /^(how are you|apa khabar|sudah makan|sihat ke|how do you feel|who made you|siapa cipta kamu|tell me a joke)/i.test(
        lower
      ) ||
      /^hey elmo,?\s+how are you/i.test(lower)
    ) {
      return {
        intent: "casual_conversation",
        executionCategory: "direct_response",
        confidence: 0.92,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities: {},
        suggestedTools: [],
        explanation: "Casual conversational exchange.",
      };
    }

    // =========================================================================
    // 4. Explicit Memory Commands (Phase 2 Company Brain)
    // =========================================================================
    // 4a. Memory Store
    if (
      /^(remember that|please remember|keep this in mind|don't forget that|ingat bahawa|sila ingat|simpan memori|记住|remember this)/i.test(
        lower
      )
    ) {
      return {
        intent: "memory_store",
        executionCategory: "action",
        confidence: 0.95,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities: { topic: raw },
        suggestedTools: [],
        explanation: "Explicit directive to commit knowledge into long-term company memory.",
      };
    }

    // 4b. Memory Forget
    if (
      /^(forget what i said|forget that|delete that memory|padam maklumat|lupakan tentang)/i.test(
        lower
      ) ||
      /\b(forget that information|delete that memory)\b/i.test(lower)
    ) {
      return {
        intent: "memory_forget",
        executionCategory: "action",
        confidence: 0.95,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities: { topic: raw },
        suggestedTools: [],
        explanation: "Explicit directive to archive or delete a piece of company memory.",
      };
    }

    // 4c. Memory Update / Correction
    if (
      /\b(that's no longer correct|that is outdated|that is wrong|maklumat itu lapuk|itu salah|tukar maklumat|update that information|change our (target )?audience|changing our (target )?audience|change our main offer|changing our main offer|audience is now)\b/i.test(
        lower
      )
    ) {
      return {
        intent: "memory_update",
        executionCategory: "action",
        confidence: 0.92,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities: { topic: raw },
        suggestedTools: [],
        explanation: "Correction or supersession of existing company knowledge.",
      };
    }

    // 4d. Memory Query
    if (
      /^(what do you remember about|what is our (main offer|target audience|current goal|business model|brand positioning)|what was our|apa yang kamu ingat|siapakah sasaran pelanggan|apakah tawaran)/i.test(
        lower
      )
    ) {
      return {
        intent: "memory_query",
        executionCategory: "direct_response",
        confidence: 0.92,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities: { topic: raw },
        suggestedTools: [],
        explanation: "Inquiry into persistent Company Brain knowledge.",
      };
    }

    // =========================================================================
    // 5. Educational / Business / Advisory Questions (DIRECT RESPONSE)
    // Examples:
    // - "What are three ways I can improve my landing page?"
    // - "What should I improve on my funnel?"
    // - "Give me three headline ideas"
    // - "What is a tripwire funnel and how does it work?"
    // =========================================================================
    const isQuestionOrAdvice =
      /^(what (is|are|should)|how (can|do|does|should)|explain|why is|give me|tell me|suggest|cadangkan|terangkan|jelaskan|apa (itu|yang)|macam mana|bagaimana|什么是)/i.test(
        lower
      ) &&
      !/\b(build me|create a|bina|buatkan|generate a new|set up a)\b/i.test(lower);

    if (isQuestionOrAdvice) {
      const isCopyInquiry = /headline ideas|copy ideas|three headlines|headline options/i.test(lower);
      return {
        intent: isCopyInquiry ? "copywriting" : "question",
        executionCategory: "direct_response",
        confidence: 0.9,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities: {
          topic: raw.replace(/^(what are|what is|how do|how can|give me|suggest|apa itu|terangkan)\s+/i, "").trim(),
        },
        suggestedTools: [],
        explanation: "Informational, conceptual, or advisory inquiry requiring a direct response.",
      };
    }

    // =========================================================================
    // 6. Natural Language Website & Section Editing / Modifications (Code-Switching Supported)
    // Examples:
    // - "Make the landing page more premium and mobile friendly"
    // - "Make the headline lebih premium and fokus on property agents"
    // - "Change the CTA to Book a Consultation"
    // - "Target property agents" / "fokus on property agents"
    // - "Make it more premium"
    // - "Make it mobile friendly"
    // =========================================================================
    const isEditingOrModifying =
      /\b(make the hero|change the cta|make this mobile|move testimonials|shorten the headline|add a lead form|more premium|lebih premium|more modern|responsive|mobile friendly|jadikan responsif)\b/i.test(
        lower
      ) ||
      /\b(edit page|modify section|update layout|change styling|tukarkan cta)\b/i.test(lower) ||
      /^(target|fokus on|focus on|sasaran)\s+([^,.]+)/i.test(lower) ||
      /^(make it|jadikan ia)\s+(more premium|lebih premium|mobile friendly|responsif)/i.test(lower);

    if (isEditingOrModifying) {
      const entities: ExtractedIntentEntities = { topic: raw };

      // Extract target audience if modified in follow-up
      const audienceMatch = raw.match(/(?:target|fokus on|focus on|sasaran|untuk)\s+([^,.]+)/i);
      if (audienceMatch) {
        entities.targetAudience = audienceMatch[1].trim();
      }

      // Extract style modifications
      if (lower.includes("premium") || lower.includes("dark mode")) {
        entities.style = "premium";
      }

      // Extract responsiveness
      if (lower.includes("mobile") || lower.includes("responsif") || lower.includes("responsive")) {
        entities.responsive = "mobile";
      }

      // Extract section targeting
      if (lower.includes("headline") || lower.includes("hero")) {
        entities.sectionType = "headline";
      } else if (lower.includes("cta") || lower.includes("button")) {
        entities.sectionType = "cta";
      }

      return {
        intent: "website_modification",
        executionCategory: "workflow",
        confidence: 0.94,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: false, // Incremental edit, can apply directly
        entities,
        suggestedTools: ["UPDATE_SECTION", "UPDATE_PAGE", "VALIDATE_CODE", "PREVIEW_PROJECT"],
        explanation: "Natural language modification to website or landing page component.",
      };
    }

    // =========================================================================
    // 7. Page / Website Creation (WORKFLOW)
    // Examples:
    // - "Build me a landing page for my AI business targeting property agents"
    // - "ELMO, buat landing page untuk property agent"
    // - "Bina landing page untuk ejen hartanah dengan tawaran percuma"
    // =========================================================================
    if (
      /\b(create|build|make|add|bina|buat|tambah)\b\s+(a\s+)?(new\s+)?.*(landing page|sales page|opt-in page|checkout page|thank you page|halaman|page|website|laman web)/i.test(
        lower
      )
    ) {
      const entities: ExtractedIntentEntities = {};
      if (lower.includes("landing")) entities.pageType = "landing";
      else if (lower.includes("sales")) entities.pageType = "sales";
      else if (lower.includes("opt-in") || lower.includes("optin")) entities.pageType = "opt-in";
      else if (lower.includes("checkout")) entities.pageType = "checkout";
      else if (lower.includes("thank")) entities.pageType = "thank-you";
      else if (lower.includes("website") || lower.includes("laman web")) entities.pageType = "custom";
      else entities.pageType = "landing";

      const audienceMatch = raw.match(/(?:for|targeting|sasaran|untuk)\s+([^,.]+)/i);
      if (audienceMatch) {
        entities.targetAudience = audienceMatch[1].trim();
      }

      const businessMatch = raw.match(/(?:for my|about|bisnes|perniagaan)\s+([^,.]+?)(?:\s+(?:targeting|for|untuk)|$)/i);
      if (businessMatch) {
        entities.topic = businessMatch[1].trim();
      }

      return {
        intent: lower.includes("website") ? "website_creation" : "page_creation",
        executionCategory: "workflow",
        confidence: 0.92,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        requestedOutcome: `landing page${entities.topic ? ` for ${entities.topic}` : ""}${entities.targetAudience ? ` targeting ${entities.targetAudience}` : ""}`,
        goalData,
        entities,
        suggestedTools: ["create_page", "create_section", "PREVIEW_PROJECT"],
        explanation: "User requested generation of a complete landing page or website.",
      };
    }

    // =========================================================================
    // 8. Funnel Creation (WORKFLOW)
    // =========================================================================
    if (
      /\b(create|build|make|set up|launch|bina|buatkan|cipta|setup)\b.*\b(funnel|lead gen|lead magnet|sales funnel|coaching funnel|webinar funnel)\b/i.test(
        lower
      ) ||
      /(bina funnel|buat funnel|create funnel|generate funnel|launch funnel)/i.test(lower)
    ) {
      const entities: ExtractedIntentEntities = {};

      if (lower.includes("webinar")) entities.funnelType = "Webinar";
      else if (lower.includes("coaching")) entities.funnelType = "Coaching";
      else if (lower.includes("course") || lower.includes("kursus")) entities.funnelType = "Course";
      else if (lower.includes("lead") || lower.includes("opt-in")) entities.funnelType = "Lead Generation";
      else if (lower.includes("appointment") || lower.includes("temujanji")) entities.funnelType = "Appointment";
      else if (lower.includes("product") || lower.includes("produk")) entities.funnelType = "Product";
      else entities.funnelType = "Lead Generation";

      const audienceMatch = raw.match(/(?:for|targeting|sasaran|untuk)\s+([^,.]+)/i);
      if (audienceMatch) {
        entities.targetAudience = audienceMatch[1].trim();
      }

      return {
        intent: "funnel_creation",
        executionCategory: "workflow",
        confidence: 0.92,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        goalData,
        entities,
        suggestedTools: ["create_funnel", "create_page", "create_form"],
        explanation: "User requested generation of a complete funnel structure.",
      };
    }

    // =========================================================================
    // 9. Copywriting
    // =========================================================================
    if (/(write|generate|draft|tulis|buat ayat|copywriting|sales letter|copy for)/i.test(lower)) {
      return {
        intent: "copywriting",
        executionCategory: "direct_response",
        confidence: 0.88,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities: { topic: raw },
        suggestedTools: ["generate_copy"],
        explanation: "User requested copy generation.",
      };
    }

    // =========================================================================
    // 10. Email Creation / Sequence
    // =========================================================================
    if (/(email sequence|email template|follow up email|nurture sequence|surat emel|emel susulan|email campaign)/i.test(lower)) {
      return {
        intent: "email_creation",
        executionCategory: "workflow",
        confidence: 0.9,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        entities: { topic: raw },
        suggestedTools: ["create_email_template", "create_email_sequence"],
        explanation: "User requested creation of email templates or automated sequences.",
      };
    }

    // =========================================================================
    // 11. Contact Management (ACTION)
    // =========================================================================
    if (/(contact|lead|subscriber|tag lead|tambah contact|senarai lead|contacts list)/i.test(lower)) {
      return {
        intent: "contact_management",
        executionCategory: "action",
        confidence: 0.85,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities: {},
        suggestedTools: ["create_contact", "add_tag"],
        explanation: "Contact or audience segment management.",
      };
    }

    // =========================================================================
    // 12. Analytics Request (DIRECT RESPONSE)
    // =========================================================================
    if (/(conversion rate|visitors|stats|analytics|drop-off|how many leads|berapa conversion|prestasi funnel|metrics)/i.test(lower)) {
      return {
        intent: "analytics_request",
        executionCategory: "direct_response",
        confidence: 0.9,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities: {},
        suggestedTools: ["get_funnel_stats", "analyze_funnel"],
        explanation: "Performance or conversion metrics inquiry.",
      };
    }

    // =========================================================================
    // 13. Goal Formulation
    // =========================================================================
    if (goalData && goalData.isGoal) {
      return {
        intent: "goal_formulation",
        executionCategory: "workflow",
        confidence: 0.9,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        goalData,
        requestedOutcome: goalData.outcome,
        timeConstraint: goalData.timeConstraint,
        entities: { goal: goalData.outcome },
        suggestedTools: [],
        explanation: "Goal formulation directive requiring strategic planning.",
      };
    }

    // =========================================================================
    // Default: General business discussion or strategic planning
    // =========================================================================
    return {
      intent: "funnel_discussion",
      executionCategory: "direct_response",
      confidence: 0.75,
      isComplexTask: false,
      requiresAction: false,
      requiresPlanning: false,
      entities: {},
      suggestedTools: [],
      explanation: "General marketing strategy or business discussion.",
    };
  }
}
