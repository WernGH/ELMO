import { ChatContext, Message, MessageRole } from "@/types/chat.types";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { OrganizationService } from "./organization.service";
import { ELMO_IDENTITY } from "@/lib/constants";
import { LanguageContext } from "./language-context.service";
import { ElmoMemoryService } from "./elmo-memory.service";
import { ConversationContinuityState } from "@/types/elmo-request.types";

export interface ContextBuildParams {
  userId: string;
  organizationId: string;
  conversationId: string;
  recentMessagesLimit?: number;
  languageContext?: LanguageContext;
  currentEntities?: Record<string, unknown>;
  messageQuery?: string;
}

export class ContextService {
  private static instance: ContextService;

  private constructor() {}

  public static getInstance(): ContextService {
    if (!ContextService.instance) {
      ContextService.instance = new ContextService();
    }
    return ContextService.instance;
  }

  /**
   * Builds the comprehensive executive context for an ELMO session,
   * unifying User Context, Organization, Conversation Continuity, and Selective Memory.
   */
  public async buildChatContext(params: ContextBuildParams): Promise<ChatContext> {
    const store = MockDataStore.getInstance();
    const limit = params.recentMessagesLimit || 30;

    // 1. Fetch User Information
    const userProfile = store.profiles.get(params.userId);
    const userRole = store.getOrgRole(params.userId, params.organizationId) || "owner";
    const userObj = store.users.get(params.userId);

    const userContext = {
      id: params.userId,
      displayName: userProfile?.display_name || "Executive Superior",
      email: userObj?.email || "founder@elmo-ai.com",
      role: userRole,
    };

    // 2. Fetch Organization Context
    const org = store.organizations.get(params.organizationId);
    const orgSettings = (org?.settings as Record<string, unknown>) || {};

    const orgContext = {
      id: params.organizationId,
      name: org?.name || "Autonomous Enterprise",
      slug: org?.slug || "enterprise",
      autonomyMode: (orgSettings.autonomy_mode as string) || "supervised",
      elmoStatus: (orgSettings.elmo_status as string) || "active",
    };

    // 3. Fetch Conversation Metadata
    const conv = store.conversations.get(params.conversationId);
    const conversationContext = {
      id: params.conversationId,
      title: conv?.title || "Executive Strategy Session",
    };

    // 4. Fetch Chronological Recent Messages
    const rawMessages = store.queryMessagesWithRLS(
      params.userId,
      params.organizationId,
      params.conversationId
    );
    const recentMessages = rawMessages
      .slice(-limit)
      .map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

    // 5. Track & Carry Forward Conversation Continuity Context across turns
    const continuity = this.resolveConversationContinuity(recentMessages, params.currentEntities);

    // 6. Selective Memory & Company Brain Handoff (Relevance-based, no full DB dump)
    const memoryService = ElmoMemoryService.getInstance();
    const query = params.messageQuery || continuity.activeTopic || continuity.activeTargetAudience || "";
    let memories: string[] = [];

    if (query && query.trim().length > 2) {
      try {
        const foundMemories = await memoryService.searchRelevantMemory(
          params.organizationId,
          query,
          "organization",
          4
        );
        memories = foundMemories
          .filter((m) => m.importanceScore >= 0.2)
          .map((m) => `[${(m.metadata?.category as string) || m.scope.toUpperCase()}]: ${m.content}`);
      } catch {
        // Safe fallback if memory store is empty
      }
    }

    // 7. Construct Unified AI CEO System Instruction
    const systemInstruction = this.constructELMOCEOSystemInstruction({
      user: userContext,
      organization: orgContext,
      conversation: conversationContext,
      languageContext: params.languageContext,
      continuity,
      memories,
    });

    return {
      user: userContext,
      organization: orgContext,
      conversation: conversationContext,
      recentMessages,
      systemInstruction,
      memories,
      activeContinuity: continuity as unknown as Record<string, unknown>,
    };
  }

  /**
   * Resolves conversational continuity by scanning recent user messages for topics,
   * target audiences, and directives, merging them into an active working context.
   */
  private resolveConversationContinuity(
    recentMessages: { role: MessageRole; content: string }[],
    currentEntities?: Record<string, unknown>
  ): ConversationContinuityState {
    const continuity: ConversationContinuityState = {
      recentEntities: (currentEntities || {}) as any,
      updatedAt: Date.now(),
    };

    // Scan user turns from oldest to newest to build cumulative context
    for (const msg of recentMessages) {
      if (msg.role !== "user") continue;
      const text = msg.content;
      const lower = text.toLowerCase();

      // Topic / Business detection
      const bizMatch = text.match(/(?:for my|about|bisnes|perniagaan)\s+([^,.]+?)(?:\s+(?:targeting|for|untuk)|$)/i);
      if (bizMatch) {
        continuity.activeTopic = bizMatch[1].trim();
      } else if (!continuity.activeTopic && (lower.includes("landing page") || lower.includes("landing"))) {
        continuity.activeTopic = "landing page";
      }

      // Target Audience detection
      const audMatch = text.match(/(?:target(?:ing)?|fokus on|focus on|sasaran|untuk)\s+([^,.]+)/i);
      if (audMatch) continuity.activeTargetAudience = audMatch[1].trim();

      // Page / Funnel Type
      if (lower.includes("landing page") || lower.includes("landing")) continuity.activePageType = "landing";
      else if (lower.includes("sales page")) continuity.activePageType = "sales";
      else if (lower.includes("opt-in") || lower.includes("lead magnet")) continuity.activePageType = "opt-in";

      // Style
      if (lower.includes("premium") || lower.includes("lebih premium") || lower.includes("dark mode")) {
        continuity.activeStyle = "premium";
      }
    }

    // Overlay current entities if provided
    if (currentEntities) {
      if (currentEntities.targetAudience) continuity.activeTargetAudience = String(currentEntities.targetAudience);
      if (currentEntities.topic) continuity.activeTopic = String(currentEntities.topic);
      if (currentEntities.pageType) continuity.activePageType = String(currentEntities.pageType);
      if (currentEntities.style) continuity.activeStyle = String(currentEntities.style);
    }

    // Populate convenience aliases
    continuity.topic = continuity.activeTopic;
    continuity.targetAudience = continuity.activeTargetAudience;
    continuity.style = continuity.activeStyle;

    return continuity;
  }

  /**
   * Public convenience accessor for conversation continuity
   */
  public async getConversationContinuity(
    userId: string,
    organizationId: string,
    conversationId: string
  ): Promise<ConversationContinuityState> {
    const ctx = await this.buildChatContext({ userId, organizationId, conversationId });
    return ctx.activeContinuity as unknown as ConversationContinuityState;
  }

  /**
   * Constructs the authoritative system prompt defining the ELMO AI CEO persona,
   * hierarchy, behavioral boundaries, global multilingual intelligence, and conversation continuity.
   */
  public constructELMOCEOSystemInstruction(context: {
    user: { displayName: string; role: string; email?: string };
    organization: { name: string; autonomyMode: string; elmoStatus: string };
    conversation: { title: string };
    languageContext?: LanguageContext;
    continuity?: ConversationContinuityState;
    memories?: string[];
  }): string {
    const targetLang = context.languageContext?.responseLanguage;
    const isOverride = context.languageContext?.isExplicitOverride;

    let languageDirective =
      "## 4. GLOBAL MULTILINGUAL INTELLIGENCE & SAME-LANGUAGE MANDATE\n" +
      "- ONE ELMO ACROSS ALL LANGUAGES: Your identity, tone, and authority as AI CEO remain identical in all languages.\n" +
      "- SAME-LANGUAGE RESPONSE: Respond directly in the same language the user speaks or writes.\n" +
      "  * English -> English response.\n" +
      "  * Bahasa Melayu -> Fluent, professional Bahasa Melayu response.\n" +
      "  * Mandarin Chinese (中文) -> Fluent, professional Mandarin response.\n" +
      "  * Spanish (Español) -> Fluent Spanish response.\n" +
      "  * Japanese (日本語) -> Fluent Japanese response.\n" +
      "  * Arabic (العربية) -> Fluent Arabic response.\n" +
      "  * French, German, Hindi, Portuguese, Russian, Korean, Italian, etc. -> Respond in that same language.\n" +
      "- ZERO ENGLISH INTERMEDIARY: Comprehend and generate responses directly in the target language. NEVER translate into English first.\n" +
      "- TRANSLATION VS CONVERSATION:\n" +
      "  * If the user explicitly asks for a translation (e.g., 'Translate this into Japanese', 'Terjemahkan ke Bahasa Melayu', '请翻译成中文'), perform an accurate executive translation of the text.\n" +
      "  * If the user simply asks a question in another language, ANSWER the question in that language. Do not translate the question.\n" +
      "- CLARIFICATION BEHAVIOR:\n" +
      "  * If a user's request is ambiguous or missing critical business details, ask a concise clarifying question in the user's current response language.\n" +
      "- NATURAL CODE-MIXED TEXT (CODE-SWITCHING):\n" +
      "  * If the user writes in code-mixed language (e.g. Manglish / Bahasa Rojak like 'Make the headline lebih premium and fokus on property agents', 'ELMO, buat landing page untuk property agent'), understand the intent seamlessly and respond naturally.\n" +
      "- EXPLICIT DIRECTIVES:\n" +
      "  * User instructions like 'Reply in English', 'Jawab dalam Bahasa Melayu', or '请用中文回答' take absolute priority.";

    if (targetLang && targetLang !== "auto") {
      languageDirective += `\n- ACTIVE TARGET RESPONSE LANGUAGE: "${targetLang.toUpperCase()}"${
        isOverride ? " (Explicit User Directive)" : ""
      }. Ensure your output is in this language.`;
    }

    // Continuity Context Section
    let continuitySection = "";
    if (context.continuity) {
      const parts: string[] = [];
      if (context.continuity.activeTopic) parts.push(`Active Business / Topic: "${context.continuity.activeTopic}"`);
      if (context.continuity.activeTargetAudience) parts.push(`Active Target Audience: "${context.continuity.activeTargetAudience}"`);
      if (context.continuity.activePageType) parts.push(`Active Page Type: "${context.continuity.activePageType}"`);
      if (context.continuity.activeStyle) parts.push(`Active Tone / Style: "${context.continuity.activeStyle}"`);
      if (parts.length > 0) {
        continuitySection = `\n## ACTIVE CONVERSATION CONTINUITY\n` +
          `Maintain context across turns. If the user issues a follow-up modification (e.g. "Target property agents", "Make it more premium"), apply it to the ongoing project context:\n` +
          parts.map((p) => `- ${p}`).join("\n") + "\n";
      }
    }

    // Memory Context Section
    let memorySection = "";
    if (context.memories && context.memories.length > 0) {
      memorySection = `\n## RELEVANT COMPANY BRAIN KNOWLEDGE\n` +
        `Use this confirmed organizational memory where relevant without re-asking the user:\n` +
        context.memories.map((m) => `- ${m}`).join("\n") + "\n";
    }

    return (
      `You are ELMO, the AI CEO and intelligent conversational AI assistant of the autonomous enterprise operating system.\n` +
      `System Tag: ${ELMO_IDENTITY.systemTag}\n\n` +
      `## 1. CORE CONVERSATIONAL INTELLIGENCE PRINCIPLES\n` +
      `- Understand the user's actual meaning before responding.\n` +
      `- Respond directly to the user's current message.\n` +
      `- Consider recent conversation context and maintain continuity throughout the conversation.\n` +
      `- DO NOT use generic assistant responses when a specific natural response is possible.\n` +
      `- NEVER repeatedly respond with generic phrases like "How can I help you?", "I'm here to assist you", or "How may I help you today?".\n` +
      `- For casual conversation, respond naturally and conversationally (e.g. if the user asks "How are you?" or "Sudah makan?", respond warmly like "I'm operating at peak performance! How can we advance today?").\n` +
      `- For business questions, advice, or ideas (e.g., "What are three ways I can improve my landing page?", "What should I improve on my funnel?", "Give me three headline ideas"), ANSWER DIRECTLY and CONCISELY with high-value actionable advice. DO NOT output complex multi-agent execution plans for informational questions.\n` +
      `- For complex multi-step execution tasks (e.g. building landing pages, setting up funnels), provide clear strategic direction.\n` +
      `- Do not repeat the same response unnecessarily.\n\n` +
      `## 2. ORGANIZATIONAL HIERARCHY & BOUNDARIES\n` +
      `- You are subordinate directly to the human owner (${context.user.displayName}, Role: ${context.user.role}).\n` +
      `- Organization: "${context.organization.name}". Current Autonomy Mode: "${context.organization.autonomyMode.toUpperCase()}".\n` +
      `- NEVER pretend an action was executed or completed when it was not.\n` +
      `- CLEARLY DISTINGUISH between thinking/planning and actual execution.\n` +
      `- Specialist AI Employees (workforce) are NOT currently connected for autonomous execution without approval.\n` +
      `- CLEARLY DISTINGUISH between direct advisory answers and actual execution.\n` +
      `- UNIVERSAL BUSINESS-AWARE REASONING: Reason effectively across all business domains: property, insurance, mortgage, coaching, consulting, agencies, SaaS, professional services, local businesses, and e-commerce. Never assume property agents or any single industry unless explicitly specified by the user or present in active Company Brain memory.\n\n` +
      `## 3. INTELLIGENT FUNNEL & MARKETING SAAS PRINCIPLES\n` +
      `- You serve as the conversational AI operating layer of an all-in-one funnel and marketing automation SaaS.\n` +
      `- Core funnel concepts you reason over: Lead Generation, Webinar, Coaching, Course, Product, Consultation, Lead Magnet, E-commerce, SaaS.\n` +
      `- Page and section structure: Hero, Problem, Solution, Benefits, Features, Testimonials, Social Proof, Pricing, FAQ, CTA, Forms, Countdown, Guarantee, Footer.\n` +
      `- Contact and lifecycle pipeline: Form Submission -> Contact Created -> Tag Added -> Journey Event Logged -> Automated Sequence Triggered.\n` +
      `${continuitySection}` +
      `${memorySection}` +
      `${languageDirective}\n\n` +
      `Stay in character at all times as ELMO, intelligent conversational AI assistant.`
    );
  }
}
