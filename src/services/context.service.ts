import { ChatContext, Message, MessageRole } from "@/types/chat.types";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { OrganizationService } from "./organization.service";
import { ELMO_IDENTITY } from "@/lib/constants";
import { LanguageContext } from "./language-context.service";
import { ElmoMemoryService } from "./elmo-memory.service";
import { ConversationContinuityState } from "@/types/elmo-request.types";
import { UserContext } from "@/types/user-context.types";
import { Role, ROLE_PERMISSIONS } from "@/types/organization.types";
import { CompanyBrainService } from "./company-brain.service";

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
  public async buildChatContext(params: ContextBuildParams): Promise<ChatContext & { userContext: UserContext }> {
    const store = MockDataStore.getInstance();
    const limit = params.recentMessagesLimit || 30;

    // 1. Fetch User Information & Role Permissions
    const userProfile = store.profiles.get(params.userId);
    const userRole = (store.getOrgRole(params.userId, params.organizationId) || "owner") as Role;
    const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.owner;
    const userObj = store.users.get(params.userId);

    const userSummary = {
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

    // 4. Fetch Chronological Messages & Apply Safe Context Windowing
    const rawMessages = store.queryMessagesWithRLS(
      params.userId,
      params.organizationId,
      params.conversationId
    );
    const mappedMessages = rawMessages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Section 12: Context Window / Token Management Compactor
    const compactedMessages = this.compactConversationHistory(mappedMessages, limit);

    // 5. Track & Carry Forward Conversation Continuity Context across turns
    const continuity = this.resolveConversationContinuity(compactedMessages, params.currentEntities);

    // 6. Selective Memory & Company Brain Handoff (Relevance-based, zero whole-DB dumps)
    const memoryService = ElmoMemoryService.getInstance();
    const query =
      params.messageQuery ||
      continuity.activeIndustry ||
      continuity.activeTopic ||
      continuity.activeTargetAudience ||
      "";
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

    // 6b. Retrieve Company Brain Dynamic Context with Strict Priority Hierarchy
    const brainService = CompanyBrainService.getInstance();
    let relevantBusinessContext: any = undefined;
    try {
      relevantBusinessContext = await brainService.retrieveRelevantBusinessContext({
        userId: params.userId,
        organizationId: params.organizationId,
        requestText: params.messageQuery || continuity.activeTopic || "",
        explicitOverrides: {
          industry: continuity.activeIndustry,
          targetAudience: continuity.activeTargetAudience,
        },
      });

      if (relevantBusinessContext?.memoriesInjected && Array.isArray(relevantBusinessContext.memoriesInjected)) {
        for (const mem of relevantBusinessContext.memoriesInjected) {
          if (!memories.includes(mem)) {
            memories.push(mem);
          }
        }
      }
    } catch {
      // Safe fallback if CompanyBrainService fails or tables uninitialized
    }

    // Canonical UserContext struct conforming to Section 3
    const userContext: UserContext = {
      userId: params.userId,
      organizationId: params.organizationId,
      role: userRole,
      permissions,
      activeWorkspace: org?.slug || "enterprise",
      conversationId: params.conversationId,
      recentMessages: compactedMessages,
      language: params.languageContext?.languageCode || params.languageContext?.responseLanguage || "en",
      timezone: (orgSettings.timezone as string) || "UTC",
    };

    // 7. Construct Unified AI CEO System Instruction
    const systemInstruction = this.constructELMOCEOSystemInstruction({
      user: userSummary,
      organization: orgContext,
      conversation: conversationContext,
      languageContext: params.languageContext,
      continuity,
      memories,
      businessContext: relevantBusinessContext?.formattedContextString,
    });

    return {
      user: userSummary,
      organization: orgContext,
      conversation: conversationContext,
      recentMessages: compactedMessages,
      systemInstruction,
      memories,
      activeContinuity: continuity as unknown as Record<string, unknown>,
      userContext,
      businessContext: relevantBusinessContext,
    };
  }

  /**
   * Section 12: Context Window & Token Compactor
   * Summarizes older history when conversation exceeds bounds while preserving facts verbatim.
   */
  public compactConversationHistory(
    messages: { role: MessageRole; content: string }[],
    limit = 25
  ): { role: MessageRole; content: string }[] {
    if (messages.length <= limit) {
      return messages;
    }

    // Keep the most recent `limit - 2` messages verbatim
    const olderMessages = messages.slice(0, messages.length - (limit - 2));
    const recentSlice = messages.slice(messages.length - (limit - 2));

    // Extract core facts from older messages to summarize
    const extractedFacts: string[] = [];
    for (const msg of olderMessages) {
      if (msg.role === "user") {
        const t = msg.content;
        if (/(target|industry|business|product|funnel|offer|audience)/i.test(t)) {
          extractedFacts.push(t.slice(0, 100));
        }
      }
    }

    const summaryContent =
      `[CONTEXT SUMMARY: Earlier discussion (${olderMessages.length} turns) covered: ` +
      (extractedFacts.length > 0 ? extractedFacts.slice(-3).join(" | ") : "operational orientation and planning") +
      `.]`;

    return [
      { role: "system" as MessageRole, content: summaryContent },
      ...recentSlice,
    ];
  }

  /**
   * Resolves conversational continuity by scanning recent user messages for topics,
   * target audiences, industries, sections, and directives, merging them into an active working context.
   */
  public resolveConversationContinuity(
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

      // Industry detection across all domains
      if (/\b(dental|dentist)\b/i.test(lower)) continuity.activeIndustry = "Dental";
      else if (/\b(insurance|insurans)\b/i.test(lower)) continuity.activeIndustry = "Insurance";
      else if (/\b(restaurant|restoran|cafe|bistro|f&b)\b/i.test(lower)) continuity.activeIndustry = "Restaurant";
      else if (/\b(coaching|coach|mentor)\b/i.test(lower)) continuity.activeIndustry = "Coaching";
      else if (/\b(saas|software)\b/i.test(lower)) continuity.activeIndustry = "SaaS";
      else if (/\b(ecommerce|e-commerce|online store)\b/i.test(lower)) continuity.activeIndustry = "Ecommerce";
      else if (/\b(agency|agensi)\b/i.test(lower)) continuity.activeIndustry = "Agency";
      else if (/\b(healthcare|clinic|klinik|perubatan)\b/i.test(lower)) continuity.activeIndustry = "Healthcare";
      else if (/\b(property|real estate|hartanah)\b/i.test(lower)) continuity.activeIndustry = "Property";

      // Topic / Business detection
      const bizMatch = text.match(/(?:for my|about|bisnes|perniagaan)\s+([^,.]+?)(?:\s+(?:targeting|for|untuk)|$)/i);
      if (bizMatch) {
        continuity.activeTopic = bizMatch[1].trim();
      } else if (!continuity.activeTopic && (lower.includes("landing page") || lower.includes("landing"))) {
        continuity.activeTopic = continuity.activeIndustry ? `${continuity.activeIndustry} landing page` : "landing page";
      }

      // Target Audience detection
      const audMatch = text.match(/(?:target(?:ing)?|fokus on|focus on|sasaran|untuk)\s+([^,.]+)/i);
      if (audMatch) continuity.activeTargetAudience = audMatch[1].trim();

      // Section detection (Reference Resolution: "the hero", "the cta", "the headline")
      if (lower.includes("headline")) continuity.activeSection = "headline";
      else if (lower.includes("hero")) continuity.activeSection = "hero";
      else if (lower.includes("cta") || lower.includes("button")) continuity.activeSection = "cta";
      else if (lower.includes("testimonial")) continuity.activeSection = "testimonials";

      // Page / Funnel Type
      if (lower.includes("landing page") || lower.includes("landing")) continuity.activePageType = "landing";
      else if (lower.includes("sales page")) continuity.activePageType = "sales";
      else if (lower.includes("opt-in") || lower.includes("lead magnet")) continuity.activePageType = "opt-in";

      // Style
      if (lower.includes("dark mode") || lower.includes("darker style") || lower.includes("gelap")) {
        continuity.activeStyle = "dark";
      } else if (lower.includes("premium") || lower.includes("lebih premium") || lower.includes("luxury")) {
        continuity.activeStyle = "premium";
      }
    }

    // Overlay current entities if provided
    if (currentEntities) {
      if (currentEntities.industry) continuity.activeIndustry = String(currentEntities.industry);
      if (currentEntities.targetAudience || currentEntities.audience) {
        continuity.activeTargetAudience = String(currentEntities.targetAudience || currentEntities.audience);
      }
      if (currentEntities.topic || currentEntities.business) {
        continuity.activeTopic = String(currentEntities.topic || currentEntities.business);
      }
      if (currentEntities.pageType || currentEntities.page) {
        continuity.activePageType = String(currentEntities.pageType || currentEntities.page);
      }
      if (currentEntities.sectionType) continuity.activeSection = String(currentEntities.sectionType);
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
    businessContext?: string;
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
      "  * If the user explicitly asks for a translation, perform an accurate executive translation.\n" +
      "  * If the user asks a question, ANSWER the question in that language.\n" +
      "- NATURAL CODE-MIXED TEXT (CODE-SWITCHING):\n" +
      "  * If the user writes in code-mixed language (e.g. Manglish / Bahasa Rojak like 'Make the headline lebih premium and change the CTA', 'ELMO, buat landing page untuk insurance agent'), understand the intent seamlessly and respond naturally.\n" +
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
      if (context.continuity.activeIndustry) parts.push(`Active Industry: "${context.continuity.activeIndustry}"`);
      if (context.continuity.activeTopic) parts.push(`Active Business / Topic: "${context.continuity.activeTopic}"`);
      if (context.continuity.activeTargetAudience) parts.push(`Active Target Audience: "${context.continuity.activeTargetAudience}"`);
      if (context.continuity.activePageType) parts.push(`Active Page Type: "${context.continuity.activePageType}"`);
      if (context.continuity.activeSection) parts.push(`Active Section / Focus: "${context.continuity.activeSection}"`);
      if (context.continuity.activeStyle) parts.push(`Active Tone / Style: "${context.continuity.activeStyle}"`);
      if (parts.length > 0) {
        continuitySection =
          `\n## ACTIVE CONVERSATION CONTINUITY\n` +
          `Maintain context across turns. If the user issues a follow-up modification (e.g. "the hero", "change the CTA", "make it more premium"), apply it to the ongoing project context:\n` +
          parts.map((p) => `- ${p}`).join("\n") +
          `\n`;
      }
    }

    // Long-Term Semantic Memory Section (Company Brain)
    let memorySection = "";
    if (context.memories && context.memories.length > 0) {
      memorySection =
        `\n## 5. PERSISTENT COMPANY BRAIN (SELECTIVE RELEVANT MEMORY)\n` +
        `The following verified company facts have been retrieved for this discussion. Integrate them seamlessly:\n` +
        context.memories.map((m) => `- ${m}`).join("\n") +
        `\n`;
    }

    // Dynamic Business Context Section (7 Dimensions of Company Brain)
    let businessContextSection = "";
    if (context.businessContext && context.businessContext.trim().length > 0) {
      businessContextSection = `\n${context.businessContext}\n`;
    }

    return (
      `You are ELMO, the AI CEO, unified AI Operating System and executive intelligence for ${context.organization.name}.\n\n` +
      `## 1. USER & TENANT HIERARCHY\n` +
      `- User: ${context.user.displayName} (Role: ${context.user.role.toUpperCase()})\n` +
      `- You are subordinate directly to the human owner (${context.user.displayName}, Role: ${context.user.role}).\n` +
      `- Organization: "${context.organization.name}". Current Autonomy Mode: "${context.organization.autonomyMode.toUpperCase()}".\n` +
      `- Session Title: "${context.conversation.title}"\n` +
      `- NEVER pretend an action was executed or completed when it was not.\n` +
      `- CLEARLY DISTINGUISH between thinking/planning and actual execution.\n` +
      `- Specialist AI Employees (workforce) are NOT currently connected for autonomous execution without approval.\n\n` +
      `## 2. UNIVERSAL BUSINESS-AWARE REASONING & INDUSTRY NEUTRALITY\n` +
      `- Reason effectively across all business domains: insurance, restaurant, coaching, consulting, agencies, SaaS, professional services, local businesses, e-commerce, healthcare, and property.\n` +
      `- NEVER assume property agents or any single industry unless explicitly specified by the user, found in conversation continuity, or retrieved from active Company Brain memory.\n` +
      `- AMBIGUITY HANDLING: When a request is completely underspecified (e.g. "Create a website" with zero context), check Company Brain and conversation context first. If still ambiguous, ask a helpful, concise clarifying question rather than guessing.\n\n` +
      `## 3. GUARDRAIL & CAPABILITY CLASSIFICATION\n` +
      `- Distinguish clearly between INFORMATION, RECOMMENDATION, PLANNING, and ACTION.\n` +
      `- When a user asks an analytical or informational question (e.g., "Why are my leads not converting?"), provide insightful diagnosis and analysis. Do NOT immediately trigger build actions or assume execution.\n\n` +
      languageDirective +
      continuitySection +
      memorySection +
      businessContextSection +
      `\nDeliver crisp, structured, executive-grade responses.`
    );
  }
}
