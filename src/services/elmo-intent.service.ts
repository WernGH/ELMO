/**
 * ELMO Phase 1 — Semantic Intent Service (ElmoIntentService)
 *
 * Semantic Intent Recognition Layer.
 * Supports all 24 canonical Phase 1 intents with zero industry bias (never defaults to property).
 * Integrates:
 * - EntityExtractionService for 20+ structured entities
 * - GoalUnderstandingService for Message vs Goal resolution
 * - AmbiguityDetectorService for strict priority evaluation
 * - Guardrail classification: "information" | "recommendation" | "planning" | "action"
 */

import {
  ElmoSaaSIntent,
  ExtractedIntentEntities,
  ExecutionCategory,
  GoalIntentData,
} from "@/types/elmo-request.types";
import { UserGoal, GuardrailCategory } from "@/types/user-context.types";
import { EntityExtractionService } from "./entity-extraction.service";
import { GoalUnderstandingService } from "./goal-understanding.service";
import { AmbiguityDetectorService } from "./ambiguity-detector.service";

export type { ElmoSaaSIntent, ExtractedIntentEntities } from "@/types/elmo-request.types";

export interface IntentAnalysisResult {
  intent: ElmoSaaSIntent;
  executionCategory?: ExecutionCategory;
  guardrailCategory?: GuardrailCategory;
  confidence: number;
  isComplexTask: boolean;
  requiresAction: boolean;
  requiresPlanning?: boolean;
  entities: ExtractedIntentEntities;
  suggestedTools: string[];
  explanation: string;
  goalData?: GoalIntentData;
  userGoal?: UserGoal;
  requestedOutcome?: string;
  timeConstraint?: string;
  isAmbiguous?: boolean;
  clarificationQuestion?: string;
  isWorkforceQuery?: boolean;
}

export class ElmoIntentService {
  private static instance: ElmoIntentService;
  private entityExtractor: EntityExtractionService;
  private goalService: GoalUnderstandingService;
  private ambiguityDetector: AmbiguityDetectorService;

  private constructor() {
    this.entityExtractor = EntityExtractionService.getInstance();
    this.goalService = GoalUnderstandingService.getInstance();
    this.ambiguityDetector = AmbiguityDetectorService.getInstance();
  }

  public static getInstance(): ElmoIntentService {
    if (!ElmoIntentService.instance) {
      ElmoIntentService.instance = new ElmoIntentService();
    }
    return ElmoIntentService.instance;
  }

  /**
   * Analyzes the user's message semantically across 24 intents,
   * extracting structured entities, user goals, and guardrail classifications.
   */
  public analyzeIntent(
    message: string,
    conversationContext?: string | {
      continuityIndustry?: string;
      continuityTopic?: string;
      continuityAudience?: string;
      companyBrain?: {
        businessIdentity?: string;
        targetAudience?: string;
        industry?: string;
      };
    }
  ): IntentAnalysisResult {
    const raw = message.trim();
    const lower = raw.toLowerCase();

    // 1. Structured Entity Extraction (20+ fields)
    const entities = this.entityExtractor.extractEntities(raw);

    // 2. Goal Understanding (User Message vs User Goal)
    const contextObj = typeof conversationContext === "object" ? conversationContext : undefined;
    const userGoal = this.goalService.resolveGoal(raw, entities, contextObj);

    // 3. Goal Intent Data (Backward compatibility)
    const goalData: GoalIntentData | undefined = userGoal.isActionable || userGoal.goalDescription.includes("reach") || userGoal.goalDescription.includes("generate")
      ? {
          isGoal: true,
          outcome: userGoal.goalDescription,
          requiresPlanning: true,
          timeConstraint: entities.deadline,
        }
      : undefined;

    // =========================================================================
    // 3b. Workforce & AI Specialist Inquiries
    // =========================================================================
    if (
      /\b(workforce status|ai employees status|ai workers status|specialist workers status|worker status|team status|ai team status|active workers|active specialists|pekerja ai|staf ai|status pekerja|status tenaga kerja)\b/i.test(lower) ||
      (/\b(workforce|ai employees|ai workers|specialists)\b/i.test(lower) && /\b(status|doing|performing|capacity|online|available)\b/i.test(lower))
    ) {
      return {
        intent: "system_status",
        executionCategory: "direct_response",
        guardrailCategory: "information",
        confidence: 0.96,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        isWorkforceQuery: true,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "Inquiry regarding the active AI workforce, specialist workers, and operational telemetry.",
      };
    }

    // =========================================================================
    // 4. Cancellation & Abort Directives
    // =========================================================================
    if (/\b(cancel|cancel that|stop that|abort|batal|batalkan|hentikan|nevermind|forget it)\b/i.test(lower)) {
      return {
        intent: "cancellation",
        executionCategory: "direct_response",
        guardrailCategory: "action",
        confidence: 0.98,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "User requested immediate cancellation of active process or directive.",
      };
    }

    // =========================================================================
    // 5. Confirmation & Approval Directives
    // =========================================================================
    if (
      /^(confirm|proceed|luluskan|approve|yes go ahead|proceed with this|let's do it|setuju|saya setuju|confirmed)[.!?]?$/i.test(
        raw
      ) ||
      /\b(approve and execute|confirm execution|proceed to launch)\b/i.test(lower)
    ) {
      return {
        intent: "confirmation",
        executionCategory: "action",
        guardrailCategory: "action",
        confidence: 0.98,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: ["execute_approved_plan"],
        explanation: "Explicit confirmation and authorization to proceed with action.",
      };
    }

    // =========================================================================
    // 6. Troubleshooting & Diagnostics
    // =========================================================================
    if (
      /(troubleshoot|debug|fix error|why is (it|this|page|form|button) failing|not working|broken|ralat|masalah teknikal|error code)/i.test(
        lower
      ) &&
      !/(create|build|make|bina)/i.test(lower)
    ) {
      return {
        intent: "troubleshooting",
        executionCategory: "direct_response",
        guardrailCategory: "information",
        confidence: 0.94,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "Inquiry to troubleshoot an error, bug, or technical issue.",
      };
    }

    // =========================================================================
    // 7. Business Analysis & Diagnosis
    // (e.g. "Why are my leads not converting?")
    // =========================================================================
    if (
      /(why are my leads not converting|why (is|are) (my|our) (leads|funnel|traffic) not converting|kenapa leads tak convert|conversion (problem|issue|drop)|low conversion|analyze my business|market analysis|competitor analysis|business analysis)/i.test(
        lower
      )
    ) {
      return {
        intent: "business_analysis",
        executionCategory: "direct_response",
        guardrailCategory: "information",
        confidence: 0.95,
        isComplexTask: false,
        requiresAction: false, // Critical: purely analytical, zero destructive action
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: ["analyze_funnel_metrics"],
        explanation: "Business diagnostic and analytical inquiry into conversion or performance.",
      };
    }

    // =========================================================================
    // 8. Research Request
    // =========================================================================
    if (/(research|kajian|investigate competitors|market research|find info about|look up|research my)/i.test(lower)) {
      return {
        intent: "research_request",
        executionCategory: "direct_response",
        guardrailCategory: "information",
        confidence: 0.92,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "Request for market, industry, or competitive research.",
      };
    }

    // =========================================================================
    // 9. Recommendations & Strategy Optimization
    // =========================================================================
    if (
      /^(what (should|can) i improve|give me advice|recommend|cadangkan|suggest|three ways to improve|best practices for|how should i optimize)/i.test(
        lower
      ) ||
      /\b(recommendation|cadangan|optimise|optimize)\b/i.test(lower)
    ) {
      return {
        intent: "recommendation",
        executionCategory: "direct_response",
        guardrailCategory: "recommendation",
        confidence: 0.92,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "Request for strategic or tactical recommendations and best practices.",
      };
    }

    // =========================================================================
    // 10. Executive Morning Briefing Triggers
    // =========================================================================
    const isMorningBriefingTrigger =
      /^(good morning elmo|morning elmo|good morning|morning|what's happening this morning|whats happening this morning|give me my morning briefing|morning briefing|give me my briefing|executive briefing|morning update|daily briefing|what should i do today|todays focus|today's focus|refresh my briefing|refresh briefing)\b/i.test(
        lower
      ) ||
      /^(selamat pagi elmo|taklimat pagi|taklimat eksekutif|apa berlaku pagi ini|apa fokus hari ini)\b/i.test(
        lower
      ) ||
      /^(早安 elmo|早晨汇报|今日早报|今日简报|今天有什么汇报|今日焦点)\b/i.test(
        lower
      ) ||
      /^(buenos días elmo|buenos dias elmo|informe matutino)\b/i.test(
        lower
      );

    if (isMorningBriefingTrigger) {
      return {
        intent: "executive_briefing",
        executionCategory: "action",
        guardrailCategory: "information",
        confidence: 0.98,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities: {
          ...entities,
          topic: "executive_morning_briefing",
          forceRefresh: lower.includes("refresh"),
        },
        userGoal,
        suggestedTools: ["get_executive_briefing"],
        explanation: "Trigger for AI-native executive morning briefing.",
      };
    }

    // =========================================================================
    // 11. Greetings
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
        guardrailCategory: "information",
        confidence: 0.95,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "Standard conversational greeting.",
      };
    }

    // =========================================================================
    // 12. Casual chat / check-in
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
        guardrailCategory: "information",
        confidence: 0.92,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "Casual conversational exchange.",
      };
    }

    // =========================================================================
    // 13. Explicit Memory Commands
    // =========================================================================
    if (/^(remember that|please remember|keep this in mind|don't forget that|ingat bahawa|sila ingat|simpan memori|记住|remember this)/i.test(lower)) {
      return {
        intent: "memory_store",
        executionCategory: "action",
        guardrailCategory: "action",
        confidence: 0.95,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities: { ...entities, topic: raw },
        userGoal,
        suggestedTools: [],
        explanation: "Explicit directive to commit knowledge into long-term company memory.",
      };
    }

    if (/^(forget what i said|forget that|delete that memory|padam maklumat|lupakan tentang)/i.test(lower) ||
        /\b(forget that information|delete that memory)\b/i.test(lower)) {
      return {
        intent: "memory_forget",
        executionCategory: "action",
        guardrailCategory: "action",
        confidence: 0.95,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities: { ...entities, topic: raw },
        userGoal,
        suggestedTools: [],
        explanation: "Explicit directive to archive or delete a piece of company memory.",
      };
    }

    if (/\b(that's no longer correct|that is outdated|that is wrong|maklumat itu lapuk|itu salah|tukar maklumat|update that information|change our (target )?audience|changing our (target )?audience|change our main offer|changing our main offer|audience is now)\b/i.test(lower)) {
      return {
        intent: "memory_update",
        executionCategory: "action",
        guardrailCategory: "action",
        confidence: 0.92,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities: { ...entities, topic: raw },
        userGoal,
        suggestedTools: [],
        explanation: "Correction or supersession of existing company knowledge.",
      };
    }

    if (/^(what do you remember about|what is our (main offer|target audience|current goal|business model|brand positioning)|what was our|apa yang kamu ingat|siapakah sasaran pelanggan|apakah tawaran)/i.test(lower)) {
      return {
        intent: "memory_query",
        executionCategory: "direct_response",
        guardrailCategory: "information",
        confidence: 0.92,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities: { ...entities, topic: raw },
        userGoal,
        suggestedTools: [],
        explanation: "Inquiry into persistent Company Brain knowledge.",
      };
    }

    // =========================================================================
    // 14. Coding Request
    // =========================================================================
    if (/(write code|code generation|react component|typescript|javascript|generate html|custom code|bina komponen|kod)/i.test(lower) &&
        !/(landing page|sales page|website)/i.test(lower)) {
      return {
        intent: "coding_request",
        executionCategory: "workflow",
        guardrailCategory: "planning",
        confidence: 0.92,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        entities,
        userGoal,
        suggestedTools: ["VALIDATE_CODE"],
        explanation: "Direct software or component coding request.",
      };
    }

    // =========================================================================
    // 15. Task & Workflow Requests
    // =========================================================================
    if (/(assign task|create a task|add to-do|task request|tugasan baru|buat task)/i.test(lower)) {
      return {
        intent: "task_request",
        executionCategory: "action",
        guardrailCategory: "planning",
        confidence: 0.9,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: ["create_task"],
        explanation: "Operational task delegation or assignment.",
      };
    }

    if (
      /\b(set goal|set a goal|target of|matlamat|our goal is|goal is to)\b/i.test(lower) &&
      !/\b(funnel|landing page|sales page|website)\b/i.test(lower)
    ) {
      return {
        intent: "goal_request",
        executionCategory: "workflow",
        guardrailCategory: "planning",
        confidence: 0.92,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        goalData,
        userGoal,
        requestedOutcome: goalData?.outcome || raw,
        timeConstraint: goalData?.timeConstraint,
        entities,
        suggestedTools: [],
        explanation: "Strategic goal formulation directive.",
      };
    }

    // =========================================================================
    // 16. Modifications & Edits (Code-Switching Supported)
    // =========================================================================
    const isEditingOrModifying =
      /\b(make the hero|change the cta|make this mobile|move testimonials|shorten the headline|add a lead form|add a booking form|add testimonials|remove pricing|suitable for a restaurant|target b2b|darker style|more premium|lebih premium|more modern|responsive|mobile friendly|jadikan responsif|connect form|publish|rollback)\b/i.test(
        lower
      ) ||
      /\b(edit page|modify section|update layout|change styling|tukarkan cta|modification)\b/i.test(lower) ||
      /^(target|fokus on|focus on|sasaran)\s+([^,.]+)/i.test(lower) ||
      /^(make it|jadikan ia)\s+(more premium|lebih premium|mobile friendly|responsif|mobile-first)/i.test(lower);

    if (isEditingOrModifying) {
      return {
        intent: "modification",
        executionCategory: "workflow",
        guardrailCategory: "action",
        confidence: 0.94,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: ["UPDATE_SECTION", "UPDATE_PAGE", "VALIDATE_CODE", "PREVIEW_PROJECT"],
        explanation: "Natural language modification to website or landing page component.",
      };
    }

    // =========================================================================
    // 17. Funnel Request / Funnel Creation / Campaign Launch
    // =========================================================================
    if (
      /\b(create|build|make|set up|launch|bina|buatkan|cipta|setup|lancarkan)\b.*\b(funnel|campaign|kempen|lead gen|lead generation|lead magnet|sales funnel|coaching funnel|webinar funnel)\b/i.test(
        lower
      ) ||
      /(bina funnel|buat funnel|create funnel|generate funnel|launch funnel|lancarkan kempen|kempen jana leads|launch a lead generation campaign|lead generation campaign)/i.test(lower)
    ) {
      return {
        intent: "funnel_creation", // Keeps exact backward compatibility with existing tests
        executionCategory: "workflow",
        guardrailCategory: "action",
        confidence: 0.92,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        goalData,
        userGoal,
        entities,
        suggestedTools: ["create_funnel", "create_page", "create_form"],
        explanation: "User requested generation of a complete funnel structure.",
      };
    }

    // =========================================================================
    // 18. Website Request / Page Request
    // =========================================================================
    if (
      /\b(create|build|make|add|bina|buat|tambah)\b\s+(a\s+)?(new\s+)?.*(landing page|sales page|opt-in page|checkout page|thank you page|halaman|page|website|laman web|dashboard|crm|portal|admin panel|internal tool|web app|web application)/i.test(
        lower
      )
    ) {
      const intentName: ElmoSaaSIntent = lower.includes("website") ? "website_creation" : "page_creation";
      return {
        intent: intentName,
        executionCategory: "workflow",
        guardrailCategory: "action",
        confidence: 0.92,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        requestedOutcome: `landing page${entities.topic ? ` for ${entities.topic}` : ""}${entities.targetAudience ? ` targeting ${entities.targetAudience}` : ""}`,
        goalData,
        userGoal,
        entities,
        suggestedTools: ["create_page", "create_section", "PREVIEW_PROJECT"],
        explanation: "User requested generation of a landing page or website.",
        isAmbiguous: userGoal.ambiguityDetected,
        clarificationQuestion: userGoal.clarificationQuestion,
      };
    }

    // =========================================================================
    // 19. Automation Request (Evaluated before generic contact/lead references)
    // =========================================================================
    if (/(automation|automate|webhook|trigger|autoresponder|otomatik)/i.test(lower)) {
      return {
        intent: "automation_request",
        executionCategory: "action",
        guardrailCategory: "action",
        confidence: 0.9,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "User requested automation workflow.",
      };
    }

    // =========================================================================
    // 20. Content Creation / Copywriting
    // =========================================================================
    if (
      !/(set goal|goal to|target of)/i.test(lower) &&
      (/(write (copy|headline|sales|content|email)|generate (copy|headline|sales|content)|draft (copy|content)|tulis ayat|buat ayat|copywriting|sales letter|copy for|write headline)/i.test(lower) ||
       /(write high-converting headline|write headline copy|headline copy)/i.test(lower))
    ) {
      return {
        intent: "copywriting", // Keeps backward compatibility
        executionCategory: "direct_response",
        guardrailCategory: "information",
        confidence: 0.88,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities: { ...entities, topic: raw },
        userGoal,
        suggestedTools: ["generate_copy"],
        explanation: "User requested copy generation or copywriting.",
      };
    }

    // =========================================================================
    // 21. Email Request
    // =========================================================================
    if (/(email sequence|email template|follow up email|nurture sequence|surat emel|emel susulan|email campaign)/i.test(lower)) {
      return {
        intent: "email_creation",
        executionCategory: "workflow",
        guardrailCategory: "action",
        confidence: 0.9,
        isComplexTask: true,
        requiresAction: true,
        requiresPlanning: true,
        entities: { ...entities, topic: raw },
        userGoal,
        suggestedTools: ["create_email_template", "create_email_sequence"],
        explanation: "User requested creation of email templates or automated sequences.",
      };
    }

    // =========================================================================
    // 22. Contact Request / Management
    // =========================================================================
    if (/(contact|subscriber|tag lead|tambah contact|senarai lead|contacts list|add a new contact|subscriber list)/i.test(lower)) {
      return {
        intent: "contact_management",
        executionCategory: "action",
        guardrailCategory: "action",
        confidence: 0.85,
        isComplexTask: false,
        requiresAction: true,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: ["create_contact", "add_tag"],
        explanation: "Contact or audience segment management.",
      };
    }

    // =========================================================================
    // 23. Analytics Request
    // =========================================================================
    if (/(conversion rate|visitors|stats|analytics|drop-off|how many leads|berapa conversion|prestasi funnel|metrics)/i.test(lower)) {
      return {
        intent: "analytics_request",
        executionCategory: "direct_response",
        guardrailCategory: "information",
        confidence: 0.9,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: ["get_funnel_stats", "analyze_funnel"],
        explanation: "Performance or conversion metrics inquiry.",
      };
    }

    // =========================================================================
    // 24. Information Request (Explicit)
    // =========================================================================
    if (/(details regarding|details about|give me details|maklumat tentang|information about|information regarding|status of our account)/i.test(lower)) {
      return {
        intent: "information_request",
        executionCategory: "direct_response",
        guardrailCategory: "information",
        confidence: 0.92,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "Direct inquiry for account, operational, or business information.",
      };
    }

    // =========================================================================
    // 25. Planning / Strategy / Questions
    // =========================================================================
    if (/(plan|blueprint|pelan|strategy|strategi|roadmap)\b/i.test(lower)) {
      return {
        intent: "planning",
        executionCategory: "direct_response",
        guardrailCategory: "planning",
        confidence: 0.9,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: true,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "Strategic planning or roadmap inquiry.",
      };
    }

    const isQuestion =
      /^(what (is|are|should)|how (can|do|does|should)|explain|why is|give me|tell me|terangkan|jelaskan|apa (itu|yang)|macam mana|bagaimana|什么是)/i.test(
        lower
      );
    if (isQuestion) {
      return {
        intent: "question",
        executionCategory: "direct_response",
        guardrailCategory: "information",
        confidence: 0.9,
        isComplexTask: false,
        requiresAction: false,
        requiresPlanning: false,
        entities,
        userGoal,
        suggestedTools: [],
        explanation: "Informational or conceptual inquiry requiring direct response.",
      };
    }

    // =========================================================================
    // Default Fallback: Information Request (Neutral, never defaults to property!)
    // =========================================================================
    return {
      intent: "information_request",
      executionCategory: "direct_response",
      guardrailCategory: "information",
      confidence: 0.75,
      isComplexTask: false,
      requiresAction: false,
      requiresPlanning: false,
      entities,
      userGoal,
      suggestedTools: [],
      explanation: "General conversational or information inquiry.",
    };
  }
}
