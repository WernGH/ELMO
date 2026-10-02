/**
 * ELMO Phase 2 — Canonical Text Intelligence Service (ELMOIntelligenceService)
 *
 * Single authoritative doorway for all ELMO text intelligence:
 * 1. Validates organization and user identity
 * 2. Manages and resolves active conversation context
 * 3. Evaluates language context via LanguageContextService (with zero English bias)
 * 4. Distinguishes translation requests from normal inquiries
 * 5. Assembles rich business context via ContextService
 * 6. Invokes LLMProvider (Gemini) with identical executive persona across all languages
 * 7. Classifies response type (ANSWER, QUESTION, SUGGESTION, PLAN, TASK, REQUIRES_APPROVAL, ERROR)
 * 8. Persists user & assistant messages with complete language & token metadata
 * 9. Records AI usage metrics
 * 10. Handles errors gracefully without exposing sensitive internals
 */

import { ChatService } from "./chat.service";
import { ContextService } from "./context.service";
import { LanguageContextService } from "./language-context.service";
import { LanguageDetectionService, ConversationalIntent } from "./voice/language-detection.service";
import { ElmoIntentService, ElmoSaaSIntent } from "./elmo-intent.service";
import { ElmoFunnelAgentService } from "./elmo-funnel-agent.service";
import { ElmoOrchestratorService } from "./agentic/elmo-orchestrator.service";
import { WorkforceRegistryService } from "./agentic/workforce-registry.service";
import { AgentRegistryService } from "./agentic/agent-registry.service";
import { ElmoMemoryService } from "./elmo-memory.service";
import { LLMProvider, LLMProviderFactory } from "./llm-provider.service";
import { GeminiService } from "./gemini.service";
import { ExecutiveBriefingService } from "./executive-briefing.service";
import { ExecutiveBriefing } from "@/types/briefing.types";
import {
  AIUsageRecord,
  GeminiResponse,
  Message,
  MessageRole,
  ResponseType,
  StreamChunk,
} from "@/types/chat.types";
import { ElmoRequest } from "@/types/elmo-request.types";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { UserContext, UserGoal, GuardrailCategory } from "@/types/user-context.types";
import { AmbiguityDetectorService } from "./ambiguity-detector.service";

export interface ProcessMessageParams {
  userId: string;
  organizationId: string;
  conversationId?: string;
  message: string;
  inputMode?: "text" | "voice";
  explicitLanguage?: string;
  abortSignal?: AbortSignal;
}

export interface TurnTelemetry {
  inputMode: "text" | "voice";
  userInput: string;
  detectedLanguage: string;
  languageCode: string;
  languageName: string;
  confidence: number;
  conversationId: string;
  intent: ConversationalIntent | string;
  saasIntent?: ElmoSaaSIntent;
  isComplexTask?: boolean;
  requiresAction?: boolean;
  suggestedTools?: string[];
  elmoResponse: string;
  timestamp: number;
  latencyMs?: number;
  elmoRequest?: ElmoRequest;
  userGoal?: UserGoal;
  guardrailCategory?: GuardrailCategory;
  userContext?: UserContext;
  isAmbiguous?: boolean;
  clarificationQuestion?: string;
  role?: string;
}

export interface ELMOResponse {
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
  text: string;
  type: ResponseType;
  responseType: ResponseType;
  content: string;
  languageCode: string;
  inputMode: "text" | "voice";
  detectedLanguage: string;
  detectedLanguageCode: string;
  responseLanguage: string;
  confidence: number;
  intent?: ConversationalIntent;
  saasIntent?: ElmoSaaSIntent;
  isComplexTask?: boolean;
  requiresAction?: boolean;
  suggestedTools?: string[];
  isExplicitOverride: boolean;
  isTranslation: boolean;
  model: string;
  provider: string;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  turnMode?: string;
  toolsExecuted?: unknown[];
  visualState?: "THINKING" | "EXECUTING" | "SUCCESS" | "ERROR";
  pendingConfirmation?: unknown;
  previewPayload?: unknown;
  executionPlan?: unknown;
  pendingApproval?: unknown;
  elmoRequest?: ElmoRequest;
  briefingPayload?: ExecutiveBriefing;
  userGoal?: UserGoal;
  guardrailCategory?: GuardrailCategory;
  userContext?: UserContext;
  isAmbiguous?: boolean;
  clarificationQuestion?: string;
}

export type StreamEventType =
  | "conversation"
  | "language"
  | "token"
  | "plan_step"
  | "telemetry"
  | "metadata"
  | "error"
  | "done";

export interface StreamEvent {
  event: StreamEventType;
  data: Record<string, unknown> | string;
}

export class ELMOIntelligenceService {
  private static instance: ELMOIntelligenceService | null = null;
  private static latestTelemetry: TurnTelemetry | null = null;
  private static telemetryListeners: Set<(telemetry: TurnTelemetry) => void> = new Set();

  private chatService: ChatService;
  private contextService: ContextService;
  private languageService: LanguageContextService;
  private llmProvider: LLMProvider;
  private usageLog: AIUsageRecord[] = [];

  public static getLatestTelemetry(): TurnTelemetry | null {
    return ELMOIntelligenceService.latestTelemetry;
  }

  public static subscribeTelemetry(listener: (telemetry: TurnTelemetry) => void): () => void {
    ELMOIntelligenceService.telemetryListeners.add(listener);
    if (ELMOIntelligenceService.latestTelemetry) {
      listener(ELMOIntelligenceService.latestTelemetry);
    }
    return () => {
      ELMOIntelligenceService.telemetryListeners.delete(listener);
    };
  }

  private publishTelemetry(telemetry: TurnTelemetry): void {
    ELMOIntelligenceService.latestTelemetry = telemetry;
    for (const listener of ELMOIntelligenceService.telemetryListeners) {
      try {
        listener(telemetry);
      } catch {}
    }
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("elmo-turn-telemetry", { detail: telemetry }));
      } catch {}
    }
  }

  private constructor(provider?: LLMProvider) {
    this.chatService = ChatService.getInstance();
    this.contextService = ContextService.getInstance();
    this.languageService = LanguageContextService.getInstance();
    this.llmProvider = provider || LLMProviderFactory.getProvider("gemini");
  }

  public static getInstance(provider?: LLMProvider): ELMOIntelligenceService {
    if (!ELMOIntelligenceService.instance) {
      ELMOIntelligenceService.instance = new ELMOIntelligenceService(provider);
    }
    return ELMOIntelligenceService.instance;
  }

  public static resetInstance(): void {
    ELMOIntelligenceService.instance = null;
  }

  /**
   * Primary non-streaming doorway for text intelligence
   */
  public async processMessage(params: ProcessMessageParams): Promise<ELMOResponse> {
    const startTime = Date.now();
    const trimmedMessage = params.message?.trim();

    if (!trimmedMessage) {
      throw new Error("Message content cannot be empty.");
    }

    if (trimmedMessage.length > 32000) {
      throw new Error("Message exceeds maximum allowable length of 32,000 characters.");
    }

    // 1. Verify tenant membership
    this.verifyTenantMembership(params.userId, params.organizationId);

    // 2. Resolve or initialize conversation
    let convId = params.conversationId;
    if (!convId) {
      const titleSnippet =
        trimmedMessage.length > 35
          ? `${trimmedMessage.slice(0, 35)}...`
          : trimmedMessage;
      try {
        const convRes = await this.chatService.createConversation(
          params.userId,
          params.organizationId,
          titleSnippet
        );
        convId = convRes?.data?.id || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      } catch {
        convId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      }
    }

    const inputMode = params.inputMode || "text";
    const langDetector = LanguageDetectionService.getInstance();
    const langDetection = langDetector.detect(
      trimmedMessage,
      inputMode,
      this.languageService.getContext().responseLanguage
    );

    // 3. Language Intelligence & Detection (Priority: Explicit -> Directives -> Script -> Hysteresis)
    const langCtx = this.languageService.updateContext(
      trimmedMessage,
      params.explicitLanguage
    );

    // 4. Distinguish translation intent from regular inquiry & SaaS Intent
    const transCheck = LanguageContextService.isTranslationRequest(trimmedMessage);
    const isTranslation = transCheck.isTranslation;
    const saasIntentAnalysis = ElmoIntentService.getInstance().analyzeIntent(trimmedMessage);
    const isDirectResponse = saasIntentAnalysis.executionCategory === "direct_response";

    const isDestructive = /(delete|remove|padam|buang)\s+(funnel|page|contact|sequence)/i.test(trimmedMessage.toLowerCase());

    // 4b. Formulate Canonical ElmoRequest (Section 6)
    const elmoRequest: ElmoRequest = {
      requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId: convId,
      userId: params.userId,
      organizationId: params.organizationId,
      message: trimmedMessage,
      source: inputMode,
      language: langCtx.languageCode || langCtx.responseLanguage || "en",
      detectedLanguage: langDetection.languageCode,
      isCodeSwitched: Boolean(langDetection.isMixed),
      intent: saasIntentAnalysis.intent,
      executionCategory: saasIntentAnalysis.executionCategory || "direct_response",
      guardrailCategory: saasIntentAnalysis.guardrailCategory || "information",
      context: { turnMode: "CONVERSATIONAL" },
      businessContext: {},
      entities: saasIntentAnalysis.entities,
      requestedOutcome: saasIntentAnalysis.requestedOutcome,
      timeConstraint: saasIntentAnalysis.timeConstraint,
      goalLikeRequest: Boolean(saasIntentAnalysis.goalData?.isGoal),
      goalData: saasIntentAnalysis.goalData,
      userGoal: saasIntentAnalysis.userGoal,
      requiresAction: saasIntentAnalysis.requiresAction,
      requiresPlanning: Boolean(saasIntentAnalysis.requiresPlanning),
      requiresApproval: isDestructive,
      priority: "medium",
      timestamp: Date.now(),
    };

    // 5. Persist user's message immediately with canonical metadata
    const userMsgRes = await this.chatService.createMessage(
      params.userId,
      params.organizationId,
      {
        conversationId: convId,
        role: "user",
        content: trimmedMessage,
        metadata: {
          input_mode: inputMode,
          inputMethod: inputMode,
          voiced: inputMode === "voice",
          language_code: langCtx.languageCode,
          language_name: langDetection.languageName,
          language_source: langDetection.source,
          language_confidence: langDetection.confidence,
          response_language: langCtx.responseLanguage,
          intent: langDetection.intent,
          saas_intent: saasIntentAnalysis.intent,
          execution_category: saasIntentAnalysis.executionCategory,
          guardrail_category: saasIntentAnalysis.guardrailCategory,
          is_complex_task: saasIntentAnalysis.isComplexTask,
          requires_action: saasIntentAnalysis.requiresAction,
          requires_planning: saasIntentAnalysis.requiresPlanning,
          suggested_tools: saasIntentAnalysis.suggestedTools,
          is_translation: isTranslation,
          isExplicitOverride: langCtx.isExplicitOverride,
          elmo_request: elmoRequest,
        },
      }
    );

    if (!userMsgRes.data) {
      throw new Error(userMsgRes.error || "Failed to record human superior directive.");
    }

    // 6. Build unified executive context with continuity tracking and selective memory
    const chatContext = await this.contextService.buildChatContext({
      userId: params.userId,
      organizationId: params.organizationId,
      conversationId: convId,
      recentMessagesLimit: 25,
      languageContext: langCtx,
      currentEntities: saasIntentAnalysis.entities,
      messageQuery: trimmedMessage,
    });
    elmoRequest.userContext = chatContext.userContext;

    // Background semantic memory extraction for Company Brain
    try {
      const memService = ElmoMemoryService.getInstance();
      await memService.extractMemoriesFromConversation(
        params.userId,
        params.organizationId,
        chatContext.recentMessages,
        trimmedMessage
      );
    } catch {
      // Non-blocking background extraction
    }

    // Section 13 & 14: Permission Enforcement
    const userRole = chatContext.userContext.role;
    const permissions = chatContext.userContext.permissions;
    if (saasIntentAnalysis.requiresAction && !permissions.canDirectELMO) {
      const permissionMsg = `You currently have '${userRole}' permissions in ${chatContext.organization.name}. Your role permits viewing analytics, reports, and conversational inquiries, but executing actions or modifying assets requires 'member', 'admin', or 'owner' privileges.`;

      const assistantMsgRes = await this.chatService.createMessage(
        params.userId,
        params.organizationId,
        {
          conversationId: convId,
          role: "assistant",
          content: permissionMsg,
          metadata: {
            input_mode: inputMode,
            role: userRole,
            permission_denied: true,
            status: "complete",
          },
        }
      );

      const latencyMs = Date.now() - startTime;
      const turnTelemetry: TurnTelemetry = {
        inputMode,
        userInput: trimmedMessage,
        detectedLanguage: langDetection.languageName,
        languageCode: langDetection.languageCode,
        languageName: langDetection.languageName,
        confidence: 0.98,
        conversationId: convId,
        intent: langDetection.intent,
        saasIntent: saasIntentAnalysis.intent,
        elmoResponse: permissionMsg,
        timestamp: Date.now(),
        latencyMs,
        elmoRequest,
        userContext: chatContext.userContext,
        role: userRole,
      };
      this.publishTelemetry(turnTelemetry);

      return {
        conversationId: convId,
        userMessage: userMsgRes.data,
        assistantMessage: assistantMsgRes.data!,
        text: permissionMsg,
        type: "ANSWER",
        responseType: "ANSWER",
        content: permissionMsg,
        languageCode: langCtx.languageCode || "en",
        inputMode,
        detectedLanguage: langDetection.languageName,
        detectedLanguageCode: langDetection.languageCode,
        responseLanguage: langCtx.responseLanguage,
        confidence: 0.98,
        intent: langDetection.intent,
        saasIntent: saasIntentAnalysis.intent,
        model: "elmo-security",
        provider: "internal",
        isExplicitOverride: false,
        isTranslation: false,
        latencyMs,
        userContext: chatContext.userContext,
      };
    }

    // Section 7: Ambiguity Handling (Strict Priority Hierarchy)
    if (saasIntentAnalysis.userGoal?.ambiguityDetected) {
      const ambiguityResult = AmbiguityDetectorService.getInstance().resolveContextHierarchy({
        message: trimmedMessage,
        entities: saasIntentAnalysis.entities,
        companyBrainContext: {
          industry: (chatContext.businessContext as any)?.activeIndustry,
          targetAudience: (chatContext.businessContext as any)?.targetAudience,
          memories: chatContext.memories?.map((m) => ({ content: m })),
        },
        conversationContinuity: chatContext.activeContinuity as any,
      });

      if (ambiguityResult.isAmbiguous && ambiguityResult.clarificationQuestion) {
        const clarificationText = ambiguityResult.clarificationQuestion;
        const assistantMsgRes = await this.chatService.createMessage(
          params.userId,
          params.organizationId,
          {
            conversationId: convId,
            role: "assistant",
            content: clarificationText,
            metadata: {
              input_mode: inputMode,
              is_clarification: true,
              ambiguity_detected: true,
              status: "complete",
            },
          }
        );

        const latencyMs = Date.now() - startTime;
        const turnTelemetry: TurnTelemetry = {
          inputMode,
          userInput: trimmedMessage,
          detectedLanguage: langDetection.languageName,
          languageCode: langDetection.languageCode,
          languageName: langDetection.languageName,
          confidence: 0.98,
          conversationId: convId,
          intent: "question",
          saasIntent: saasIntentAnalysis.intent,
          elmoResponse: clarificationText,
          timestamp: Date.now(),
          latencyMs,
          elmoRequest,
          userContext: chatContext.userContext,
          isAmbiguous: true,
          clarificationQuestion: clarificationText,
        };
        this.publishTelemetry(turnTelemetry);

        return {
          conversationId: convId,
          userMessage: userMsgRes.data,
          assistantMessage: assistantMsgRes.data!,
          text: clarificationText,
          type: "QUESTION",
          responseType: "QUESTION",
          content: clarificationText,
          languageCode: langCtx.languageCode || "en",
          inputMode,
          detectedLanguage: langDetection.languageName,
          detectedLanguageCode: langDetection.languageCode,
          responseLanguage: langCtx.responseLanguage,
          confidence: 0.98,
          intent: "question",
          saasIntent: saasIntentAnalysis.intent,
          model: "gemini-3-flash-preview",
          provider: "gemini",
          isExplicitOverride: false,
          isTranslation: false,
          latencyMs,
          userContext: chatContext.userContext,
          isAmbiguous: true,
          clarificationQuestion: clarificationText,
        };
      }
    }

    const funnelAgent = ElmoFunnelAgentService.getInstance();
    const hasPendingConfirmation = funnelAgent.hasPendingConfirmation(params.organizationId, params.userId);
    const lowerMessage = trimmedMessage.toLowerCase();

    // =========================================================================
    // 6a. ELMO Executive Morning Briefing Handling
    // =========================================================================
    const isBriefingRequest =
      saasIntentAnalysis.intent === "executive_briefing" ||
      /^(good morning elmo|morning elmo|good morning|what's happening this morning|whats happening this morning|give me my morning briefing|morning briefing|give me my briefing|executive briefing|morning update|daily briefing|what should i do today|todays focus|today's focus|refresh my briefing|refresh briefing)\b/i.test(
        lowerMessage
      ) ||
      /^(selamat pagi elmo|taklimat pagi|taklimat eksekutif|apa berlaku pagi ini|apa fokus hari ini)\b/i.test(
        lowerMessage
      ) ||
      /^(早安 elmo|早晨汇报|今日早报|今日简报|今天有什么汇报|今日焦点)\b/i.test(
        lowerMessage
      ) ||
      /^(buenos días elmo|buenos dias elmo|informe matutino)\b/i.test(
        lowerMessage
      );

    if (isBriefingRequest) {
      const briefingService = ExecutiveBriefingService.getInstance();
      const forceRefresh = lowerMessage.includes("refresh");
      const briefing = await briefingService.getOrGenerateBriefing({
        userId: params.userId,
        organizationId: params.organizationId,
        language: langCtx.responseLanguage || "en",
        forceRefresh,
      });

      // Spoken briefing for voice mode, structured markdown for text mode
      let responseText: string;
      if (inputMode === "voice") {
        responseText = briefing.spokenBriefing;
      } else {
        responseText = this.formatMarkdownBriefing(briefing, chatContext.organization?.name || "Enterprise");
      }

      const assistantMsgRes = await this.chatService.createMessage(
        params.userId,
        params.organizationId,
        {
          conversationId: convId,
          role: "assistant",
          content: responseText,
          metadata: {
            input_mode: inputMode,
            inputMethod: inputMode,
            voiced: inputMode === "voice",
            language_code: langCtx.languageCode,
            response_language: langCtx.responseLanguage,
            intent: "question",
            saas_intent: "executive_briefing",
            briefingId: briefing.id,
            briefingPayload: briefing,
          },
        }
      );

      const latencyMs = Date.now() - startTime;
      const elmoRes: ELMOResponse = {
        conversationId: convId,
        userMessage: userMsgRes.data,
        assistantMessage: assistantMsgRes.data!,
        text: responseText,
        type: "ANSWER",
        responseType: "ANSWER",
        content: responseText,
        languageCode: langCtx.languageCode || "en",
        inputMode,
        detectedLanguage: langDetection.languageName,
        detectedLanguageCode: langDetection.languageCode,
        responseLanguage: langCtx.responseLanguage,
        confidence: 0.98,
        intent: "question",
        saasIntent: "executive_briefing",
        model: "gemini-3-flash-preview",
        provider: "gemini",
        isExplicitOverride: Boolean(langCtx.isExplicitOverride),
        isTranslation: false,
        latencyMs,
        visualState: "SUCCESS",
        briefingPayload: briefing,
      };

      this.publishTelemetry({
        inputMode,
        userInput: trimmedMessage,
        detectedLanguage: langDetection.languageName,
        languageCode: langDetection.languageCode,
        languageName: langDetection.languageName,
        confidence: 0.98,
        conversationId: convId,
        intent: "question",
        saasIntent: "executive_briefing",
        elmoResponse: responseText,
        timestamp: Date.now(),
        latencyMs,
        elmoRequest,
      });

      return elmoRes;
    }

    // =========================================================================
    // 6b. ELMO AI Workforce Status & Telemetry Handling
    // =========================================================================
    const isWorkforceInquiry =
      saasIntentAnalysis.isWorkforceQuery ||
      /(workforce status|ai employees status|worker status|ai team status|how (is|are) (my|our) (workers|workforce|ai team|specialists)|status pekerja|status tenaga kerja|siapa buat copy|who is working on)/i.test(
        lowerMessage
      );

    if (isWorkforceInquiry) {
      const workforceRegistry = WorkforceRegistryService.getInstance();
      const agentRegistry = AgentRegistryService.getInstance();
      const workers = agentRegistry.getWorkers({ organizationId: params.organizationId });
      const metrics = workforceRegistry.getWorkforcePerformanceMetrics(params.organizationId);
      const activeAssignments = workforceRegistry.getActiveWorkerAssignments(params.organizationId);
      const recentHandoffs = workforceRegistry.getWorkerHandoffs(params.organizationId).slice(-5);

      const isMalay = langCtx.responseLanguage === "ms" || langDetection.languageCode === "ms";
      let responseText: string;

      if (isMalay) {
        responseText = `**Laporan Status Tenaga Kerja AI ELMO:**\n\n` +
          `• **Pakar Aktif**: ${workers.filter((w) => w.enabled).length} daripada ${workers.length} pekerja beroperasi secara optimum.\n` +
          `• **Kapasiti Keseluruhan**: ${workers.reduce((acc, w) => acc + w.capacity, 0)} slot tugas (${activeAssignments.length} tugasan aktif sedang berjalan).\n` +
          `• **Kadar Kebolehpercayaan**: ${(metrics.reliabilityRate * 100).toFixed(1)}% dengan purata masa pelaksanaan ${Math.round(metrics.averageExecutionTimeMs / 1000)}s.\n` +
          `• **Serahan Kerja Terkini**: ${recentHandoffs.length} kontrak serahan berstruktur disahkan bebas halangan.\n\n` +
          `Semua pekerja pakar bersedia menerima arahan strategik anda.`;
      } else {
        responseText = `**ELMO Governed AI Workforce Status Report:**\n\n` +
          `• **Active Specialists**: ${workers.filter((w) => w.enabled).length} of ${workers.length} specialists online and governed under ELMO Central Brain.\n` +
          `• **Workforce Capacity**: ${workers.reduce((acc, w) => acc + w.capacity, 0)} slots (${activeAssignments.length} active assignments in progress).\n` +
          `• **Performance Reliability**: ${(metrics.reliabilityRate * 100).toFixed(1)}% (Avg duration: ${(metrics.averageExecutionTimeMs / 1000).toFixed(1)}s).\n` +
          `• **Structured Handoffs**: ${metrics.totalHandoffs} verified contracts completed with zero unmediated chatter.\n\n` +
          `Your workforce is operating smoothly and standing by for business objectives.`;
      }

      const assistantMsgRes = await this.chatService.createMessage(
        params.userId,
        params.organizationId,
        {
          conversationId: convId,
          role: "assistant",
          content: responseText,
          metadata: {
            input_mode: inputMode,
            workforce_telemetry: true,
            status: "complete",
          },
        }
      );

      const latencyMs = Date.now() - startTime;
      const elmoRes: ELMOResponse = {
        conversationId: convId,
        userMessage: userMsgRes.data,
        assistantMessage: assistantMsgRes.data!,
        text: responseText,
        type: "ANSWER",
        responseType: "ANSWER",
        content: responseText,
        languageCode: langCtx.languageCode || "en",
        inputMode,
        detectedLanguage: langDetection.languageName,
        detectedLanguageCode: langDetection.languageCode,
        responseLanguage: langCtx.responseLanguage,
        confidence: 0.98,
        intent: "question",
        saasIntent: "system_status",
        model: "elmo-workforce-engine",
        provider: "internal",
        isExplicitOverride: Boolean(langCtx.isExplicitOverride),
        isTranslation: false,
        latencyMs,
        visualState: "SUCCESS",
      };

      this.publishTelemetry({
        inputMode,
        userInput: trimmedMessage,
        detectedLanguage: langDetection.languageName,
        languageCode: langDetection.languageCode,
        languageName: langDetection.languageName,
        confidence: 0.98,
        conversationId: convId,
        intent: "question",
        saasIntent: "system_status",
        elmoResponse: responseText,
        timestamp: Date.now(),
        latencyMs,
        elmoRequest,
      });

      return elmoRes;
    }
    const isFunnelAction =
      saasIntentAnalysis.requiresAction ||
      [
        "funnel_creation",
        "funnel_modification",
        "page_creation",
        "page_modification",
        "email_creation",
        "contact_management",
        "automation_request",
        "task_execution",
      ].includes(saasIntentAnalysis.intent);
    const isFunnelPlanOrRec =
      /(which funnel|what funnel|recommend|cadangkan|funnel apa sesuai|cadangan funnel)/i.test(lowerMessage) ||
      /(plan|design|blueprint|rangka|pelan|lakarkan)\s+(a\s+)?(funnel|webinar|campaign)/i.test(lowerMessage);
    const isFunnelSpecificQuestion =
      /(what should (our|the) (landing page|funnel|page) focus on|what should we focus on|focus of our landing page|apa fokus|what was our (previous|former|old) audience|previous audience)/i.test(
        lowerMessage
      ) ||
      ((lowerMessage.includes("focus on") || lowerMessage.includes("target audience") || lowerMessage.includes("core offer")) &&
       (saasIntentAnalysis.intent === "funnel_discussion" || saasIntentAnalysis.intent === "question"));

    const isMemoryCommand =
      saasIntentAnalysis.intent === "memory_store" ||
      saasIntentAnalysis.intent === "memory_forget" ||
      saasIntentAnalysis.intent === "memory_update" ||
      saasIntentAnalysis.intent === "memory_query";

    const isWebsiteOrCoding =
      !isDirectResponse &&
      (saasIntentAnalysis.intent === "website_creation" ||
       saasIntentAnalysis.intent === "page_creation" ||
       saasIntentAnalysis.intent === "website_modification" ||
       saasIntentAnalysis.intent === "component_creation" ||
       saasIntentAnalysis.intent === "code_generation" ||
       saasIntentAnalysis.intent === "preview_request" ||
       saasIntentAnalysis.intent === "funnel_creation" ||
       saasIntentAnalysis.intent === "planning" ||
       saasIntentAnalysis.intent === "task_execution" ||
       saasIntentAnalysis.intent === "goal_formulation" ||
       /\b(bina|buat|build|create|make|launch|design)\b.*\b(landing page|sales page|website|webpage|web app|crm|dashboard|portal|application|laman web|halaman)\b/i.test(
         lowerMessage
       ) ||
       /(build me a landing page|create me a landing page|create a landing page|build a complete website|build a website|bina landing page|make the hero|change the cta|mobile friendly|move testimonials|more premium|shorten the headline|add a lead form|dark mode)/i.test(
         lowerMessage
       ) ||
       /(launch a lead generation campaign|create a campaign to get more leads|lead generation campaign|get me more qualified leads|get more qualified leads|campaign for my business|research my competitors|kempen jana leads)/i.test(
         lowerMessage
       ) ||
       /(build a simple crm|crm dashboard|sales team dashboard|customer portal|internal tool)/i.test(
         lowerMessage
       ));

    if (isWebsiteOrCoding) {
      try {
        const orchestrator = ElmoOrchestratorService.getInstance();
        const orchRes = await orchestrator.orchestrate({
          userId: params.userId,
          organizationId: params.organizationId,
          conversationId: convId,
          message: trimmedMessage,
          intentAnalysis: saasIntentAnalysis,
          language: langCtx.responseLanguage,
          companyBrainContext: {
            organization: chatContext.organization,
            memories: chatContext.memories,
          },
        });

        if (!orchRes.isDirectAnswer) {
          const responseText = orchRes.response;
          const responseType: ResponseType = orchRes.pendingApproval ? "REQUIRES_APPROVAL" : "ANSWER";

          const assistantMsgRes = await this.chatService.createMessage(
            params.userId,
            params.organizationId,
            {
              conversationId: convId,
              role: "assistant",
              content: responseText,
              metadata: {
                input_mode: inputMode,
                inputMethod: inputMode,
                voiced: inputMode === "voice",
                provider: "elmo-orchestrator",
                model: "gemini-2.5-flash",
                tokensUsed: { promptTokens: 140, completionTokens: 180, totalTokens: 320 },
                latencyMs: Date.now() - startTime,
                message_type: responseType,
                type: responseType,
                visual_state: orchRes.visualState,
                execution_plan: orchRes.plan,
                preview_payload: orchRes.previewPayload,
                pending_approval: orchRes.pendingApproval,
                language_code: langCtx.responseLanguage,
                language_name: langDetection.languageName,
                language_source: langDetection.source,
                language_confidence: langDetection.confidence,
                response_language: langCtx.responseLanguage,
                intent: langDetection.intent,
                saas_intent: saasIntentAnalysis.intent,
                is_translation: isTranslation,
                is_clarification: false,
                status: "complete",
                elmo_request: elmoRequest,
              },
            }
          );

          if (!assistantMsgRes.data) {
            throw new Error(assistantMsgRes.error || "Failed to record assistant response.");
          }

          const totalLatency = Date.now() - startTime;
          return {
            conversationId: convId,
            userMessage: userMsgRes.data,
            assistantMessage: assistantMsgRes.data,
            text: responseText,
            type: responseType,
            responseType,
            content: responseText,
            turnMode: "EXECUTION",
            languageCode: langCtx.responseLanguage,
            inputMode,
            detectedLanguage: langCtx.detectedLanguage,
            detectedLanguageCode: langCtx.languageCode || langCtx.detectedLanguage,
            responseLanguage: langCtx.responseLanguage,
            confidence: langCtx.confidence,
            intent: langDetection.intent,
            saasIntent: saasIntentAnalysis.intent,
            isComplexTask: saasIntentAnalysis.isComplexTask,
            requiresAction: saasIntentAnalysis.requiresAction,
            suggestedTools: saasIntentAnalysis.suggestedTools,
            isExplicitOverride: langCtx.isExplicitOverride || false,
            isTranslation,
            model: "gemini-2.5-flash",
            provider: "elmo-orchestrator",
            latencyMs: totalLatency,
            visualState: orchRes.visualState as any,
            previewPayload: orchRes.previewPayload,
            executionPlan: orchRes.plan,
            pendingApproval: orchRes.pendingApproval,
            elmoRequest,
          };
        }
      } catch (orchErr) {
        // Fall back to standard flow if orchestration encounters unexpected error
      }
    }

    const shouldUseFunnelAgent =
      hasPendingConfirmation ||
      isDestructive ||
      isFunnelAction ||
      isFunnelPlanOrRec ||
      isFunnelSpecificQuestion ||
      isMemoryCommand;

    if (shouldUseFunnelAgent) {
      try {
        const agentResult = await funnelAgent.processDirective({
          userId: params.userId,
          organizationId: params.organizationId,
          conversationId: convId,
          message: trimmedMessage,
          languageContext: langCtx,
          inputMode,
        });

        const responseText = agentResult.response;
        const responseType = this.mapTurnModeToResponseType(agentResult.turnMode);
        const isClarification = responseType === "QUESTION";

        // Persist assistant response to the same conversation
        const assistantMsgRes = await this.chatService.createMessage(
          params.userId,
          params.organizationId,
          {
            conversationId: convId,
            role: "assistant",
            content: responseText,
            metadata: {
              input_mode: inputMode,
              inputMethod: inputMode,
              voiced: inputMode === "voice",
              provider: "elmo-funnel-agent",
              model: "gemini-2.5-flash",
              tokensUsed: { promptTokens: 120, completionTokens: 150, totalTokens: 270 },
              latencyMs: Date.now() - startTime,
              message_type: responseType,
              type: responseType,
              turn_mode: agentResult.turnMode,
              visual_state: agentResult.visualState,
              tools_executed: agentResult.toolsExecuted.map((t) => t.tool),
              language_code: langCtx.responseLanguage,
              language_name: langDetection.languageName,
              language_source: langDetection.source,
              language_confidence: langDetection.confidence,
              response_language: langCtx.responseLanguage,
              intent: langDetection.intent,
              saas_intent: saasIntentAnalysis.intent,
              is_translation: isTranslation,
              is_clarification: isClarification,
              status: "complete",
              elmo_request: elmoRequest,
            },
          }
        );

        if (!assistantMsgRes.data) {
          throw new Error(assistantMsgRes.error || "Failed to record assistant response.");
        }

        const totalLatency = Date.now() - startTime;
        const turnTelemetry: TurnTelemetry = {
          inputMode,
          userInput: trimmedMessage,
          detectedLanguage: langCtx.responseLanguage,
          languageCode: langCtx.responseLanguage,
          languageName: langDetection.languageName,
          confidence: langDetection.confidence,
          conversationId: convId,
          intent: langDetection.intent,
          saasIntent: saasIntentAnalysis.intent,
          isComplexTask: saasIntentAnalysis.isComplexTask,
          requiresAction: saasIntentAnalysis.requiresAction,
          suggestedTools: saasIntentAnalysis.suggestedTools,
          elmoResponse: responseText,
          timestamp: Date.now(),
          latencyMs: totalLatency,
          elmoRequest,
        };
        this.publishTelemetry(turnTelemetry);

        console.log(
          `[INPUT MODE]: ${inputMode.toUpperCase()}\n` +
          `[USER INPUT]: "${trimmedMessage}"\n` +
          `[DETECTED LANGUAGE]: ${langCtx.responseLanguage} (${langDetection.languageName})\n` +
          `[LANGUAGE CONFIDENCE]: ${langDetection.confidence}\n` +
          `[CONVERSATION ID]: ${convId}\n` +
          `[INTENT]: ${langDetection.intent} | SAAS: ${saasIntentAnalysis.intent}\n` +
          `[ELMO RESPONSE]: "${responseText.slice(0, 100)}..."`
        );

        return {
          conversationId: convId,
          userMessage: userMsgRes.data,
          assistantMessage: assistantMsgRes.data,
          text: responseText,
          type: responseType,
          responseType,
          content: responseText,
          turnMode: agentResult.turnMode,
          toolsExecuted: agentResult.toolsExecuted,
          visualState: agentResult.visualState,
          pendingConfirmation: agentResult.pendingConfirmation,
          languageCode: langCtx.responseLanguage,
          inputMode,
          detectedLanguage: langCtx.detectedLanguage,
          detectedLanguageCode: langCtx.languageCode || langCtx.detectedLanguage,
          responseLanguage: langCtx.responseLanguage,
          confidence: langCtx.confidence,
          intent: langDetection.intent,
          saasIntent: saasIntentAnalysis.intent,
          isComplexTask: saasIntentAnalysis.isComplexTask,
          requiresAction: saasIntentAnalysis.requiresAction,
          suggestedTools: saasIntentAnalysis.suggestedTools,
          isExplicitOverride: langCtx.isExplicitOverride || false,
          isTranslation,
          model: "gemini-2.5-flash",
          provider: "elmo-funnel-agent",
          tokensUsed: { promptTokens: 120, completionTokens: 150, totalTokens: 270 },
          latencyMs: totalLatency,
          elmoRequest,
        };
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        throw new Error(`ELMO Intelligence Engine Error: ${errMessage}`);
      }
    }

    try {
      // 7. Call LLM Provider (Gemini)
      const providerRes: GeminiResponse = await this.llmProvider.generateResponse({
        prompt: trimmedMessage,
        systemInstruction: chatContext.systemInstruction,
        history: chatContext.recentMessages.slice(0, -1), // exclude current message passed as prompt
        abortSignal: params.abortSignal,
      });

      const responseText = providerRes.text;
      const responseType = this.classifyResponseType(responseText);
      const isClarification = responseType === "QUESTION";

      // 8. Persist assistant response to the same conversation
      const assistantMsgRes = await this.chatService.createMessage(
        params.userId,
        params.organizationId,
        {
          conversationId: convId,
          role: "assistant",
          content: responseText,
          metadata: {
            input_mode: inputMode,
            inputMethod: inputMode,
            voiced: inputMode === "voice",
            provider: this.llmProvider.name,
            model: providerRes.model,
            tokensUsed: providerRes.tokensUsed,
            latencyMs: providerRes.latencyMs,
            message_type: responseType,
            type: responseType,
            language_code: langCtx.responseLanguage,
            language_name: langDetection.languageName,
            language_source: langDetection.source,
            language_confidence: langDetection.confidence,
            response_language: langCtx.responseLanguage,
            intent: langDetection.intent,
            saas_intent: saasIntentAnalysis.intent,
            is_translation: isTranslation,
            is_clarification: isClarification,
            status: "complete",
            elmo_request: elmoRequest,
          },
        }
      );

      if (!assistantMsgRes.data) {
        throw new Error(assistantMsgRes.error || "Failed to record assistant response.");
      }

      // 9. Track AI Usage
      const usageRecord: AIUsageRecord = {
        organization_id: params.organizationId,
        user_id: params.userId,
        conversation_id: convId,
        provider: this.llmProvider.name,
        model: providerRes.model,
        timestamp: Date.now(),
        inputTokens: providerRes.tokensUsed?.promptTokens || 0,
        outputTokens: providerRes.tokensUsed?.completionTokens || 0,
        totalTokens: providerRes.tokensUsed?.totalTokens || 0,
        requestType: isTranslation ? "translation" : "conversation",
      };
      this.recordUsage(usageRecord);

      const totalLatency = Date.now() - startTime;

      // Section 24 & 25: Publish telemetry and development logging
      const turnTelemetry: TurnTelemetry = {
        inputMode,
        userInput: trimmedMessage,
        detectedLanguage: langCtx.responseLanguage,
        languageCode: langCtx.responseLanguage,
        languageName: langDetection.languageName,
        confidence: langDetection.confidence,
        conversationId: convId,
        intent: langDetection.intent,
        saasIntent: saasIntentAnalysis.intent,
        isComplexTask: saasIntentAnalysis.isComplexTask,
        requiresAction: saasIntentAnalysis.requiresAction,
        suggestedTools: saasIntentAnalysis.suggestedTools,
        elmoResponse: responseText,
        timestamp: Date.now(),
        latencyMs: totalLatency,
        elmoRequest,
      };
      this.publishTelemetry(turnTelemetry);

      console.log(
        `[INPUT MODE]: ${inputMode.toUpperCase()}\n` +
        `[USER INPUT]: "${trimmedMessage}"\n` +
        `[DETECTED LANGUAGE]: ${langCtx.responseLanguage} (${langDetection.languageName})\n` +
        `[LANGUAGE CONFIDENCE]: ${langDetection.confidence}\n` +
        `[CONVERSATION ID]: ${convId}\n` +
        `[INTENT]: ${langDetection.intent} | SAAS: ${saasIntentAnalysis.intent}\n` +
        `[ELMO RESPONSE]: "${responseText.slice(0, 100)}..."`
      );

      return {
        conversationId: convId,
        userMessage: userMsgRes.data,
        assistantMessage: assistantMsgRes.data,
        text: responseText,
        type: responseType,
        responseType,
        content: responseText,
        languageCode: langCtx.responseLanguage,
        inputMode,
        detectedLanguage: langCtx.detectedLanguage,
        detectedLanguageCode: langCtx.languageCode || langCtx.detectedLanguage,
        responseLanguage: langCtx.responseLanguage,
        confidence: langCtx.confidence,
        intent: langDetection.intent,
        saasIntent: saasIntentAnalysis.intent,
        isComplexTask: saasIntentAnalysis.isComplexTask,
        requiresAction: saasIntentAnalysis.requiresAction,
        suggestedTools: saasIntentAnalysis.suggestedTools,
        isExplicitOverride: langCtx.isExplicitOverride || false,
        isTranslation,
        model: providerRes.model,
        provider: this.llmProvider.name,
        tokensUsed: providerRes.tokensUsed,
        latencyMs: totalLatency,
        elmoRequest,
      };
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`ELMO Intelligence Engine Error: ${errMessage}`);
    }
  }

  /**
   * SSE Streaming doorway for Progressive Text Generation
   */
  public async *streamMessage(
    params: ProcessMessageParams
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const trimmedMessage = params.message?.trim();

    if (!trimmedMessage) {
      yield { event: "error", data: { error: "Message content cannot be empty." } };
      return;
    }

    // 1. Verify tenant membership
    try {
      this.verifyTenantMembership(params.userId, params.organizationId);
    } catch (authErr: any) {
      yield { event: "error", data: { error: authErr.message } };
      return;
    }

    // 2. Resolve or create conversation
    let convId = params.conversationId;
    if (!convId) {
      const titleSnippet =
        trimmedMessage.length > 35
          ? `${trimmedMessage.slice(0, 35)}...`
          : trimmedMessage;
      try {
        const convRes = await this.chatService.createConversation(
          params.userId,
          params.organizationId,
          titleSnippet
        );
        convId = convRes?.data?.id || `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      } catch {
        convId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      }
    }

    // Emit active conversation ID event
    yield { event: "conversation", data: { conversationId: convId } };

    const inputMode = params.inputMode || "text";
    const langDetector = LanguageDetectionService.getInstance();
    const langDetection = langDetector.detect(
      trimmedMessage,
      inputMode,
      this.languageService.getContext().responseLanguage
    );

    // 3. Language Intelligence & Detection
    const langCtx = this.languageService.updateContext(
      trimmedMessage,
      params.explicitLanguage
    );
    const transCheck = LanguageContextService.isTranslationRequest(trimmedMessage);
    const isTranslation = transCheck.isTranslation;
    const saasIntentAnalysis = ElmoIntentService.getInstance().analyzeIntent(trimmedMessage);
    const isDirectResponse = saasIntentAnalysis.executionCategory === "direct_response";

    const isDestructive = /(delete|remove|padam|buang)\s+(funnel|page|contact|sequence)/i.test(trimmedMessage.toLowerCase());

    const elmoRequest: ElmoRequest = {
      requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      conversationId: convId,
      userId: params.userId,
      organizationId: params.organizationId,
      message: trimmedMessage,
      source: inputMode,
      language: langCtx.languageCode || langCtx.responseLanguage || "en",
      detectedLanguage: langDetection.languageCode,
      isCodeSwitched: Boolean(langDetection.isMixed),
      intent: saasIntentAnalysis.intent,
      executionCategory: saasIntentAnalysis.executionCategory || "direct_response",
      guardrailCategory: saasIntentAnalysis.guardrailCategory || "information",
      context: { turnMode: "STREAMING" },
      businessContext: {},
      entities: saasIntentAnalysis.entities,
      requestedOutcome: saasIntentAnalysis.requestedOutcome,
      timeConstraint: saasIntentAnalysis.timeConstraint,
      goalLikeRequest: Boolean(saasIntentAnalysis.goalData?.isGoal),
      goalData: saasIntentAnalysis.goalData,
      userGoal: saasIntentAnalysis.userGoal,
      requiresAction: saasIntentAnalysis.requiresAction,
      requiresPlanning: Boolean(saasIntentAnalysis.requiresPlanning),
      requiresApproval: isDestructive,
      priority: "medium",
      timestamp: Date.now(),
    };

    // Emit language detection telemetry event
    yield {
      event: "language",
      data: {
        detectedLanguage: langCtx.detectedLanguage,
        detectedLanguageCode: langCtx.languageCode,
        responseLanguage: langCtx.responseLanguage,
        confidence: langCtx.confidence,
        intent: langDetection.intent,
        saasIntent: saasIntentAnalysis.intent,
        executionCategory: saasIntentAnalysis.executionCategory,
        guardrailCategory: saasIntentAnalysis.guardrailCategory,
        isComplexTask: saasIntentAnalysis.isComplexTask,
        requiresAction: saasIntentAnalysis.requiresAction,
        requiresPlanning: saasIntentAnalysis.requiresPlanning,
        inputMode,
        isExplicitOverride: langCtx.isExplicitOverride || false,
        isTranslation,
        elmoRequest,
      },
    };

    // 4. Persist user message with canonical metadata
    await this.chatService.createMessage(params.userId, params.organizationId, {
      conversationId: convId,
      role: "user",
      content: trimmedMessage,
      metadata: {
        input_mode: inputMode,
        inputMethod: inputMode,
        voiced: inputMode === "voice",
        language_code: langCtx.languageCode,
        language_name: langDetection.languageName,
        language_source: langDetection.source,
        language_confidence: langDetection.confidence,
        response_language: langCtx.responseLanguage,
        intent: langDetection.intent,
        saas_intent: saasIntentAnalysis.intent,
        execution_category: saasIntentAnalysis.executionCategory,
        guardrail_category: saasIntentAnalysis.guardrailCategory,
        is_complex_task: saasIntentAnalysis.isComplexTask,
        requires_action: saasIntentAnalysis.requiresAction,
        requires_planning: saasIntentAnalysis.requiresPlanning,
        suggested_tools: saasIntentAnalysis.suggestedTools,
        is_translation: isTranslation,
        elmo_request: elmoRequest,
      },
    });

    // 5. Build context with continuity tracking and selective memory
    const chatContext = await this.contextService.buildChatContext({
      userId: params.userId,
      organizationId: params.organizationId,
      conversationId: convId,
      recentMessagesLimit: 25,
      languageContext: langCtx,
      currentEntities: saasIntentAnalysis.entities,
      messageQuery: trimmedMessage,
    });
    elmoRequest.userContext = chatContext.userContext;

    // Background semantic memory extraction for Company Brain
    try {
      const memService = ElmoMemoryService.getInstance();
      await memService.extractMemoriesFromConversation(
        params.userId,
        params.organizationId,
        chatContext.recentMessages,
        trimmedMessage
      );
    } catch {
      // Non-blocking background extraction
    }

    // Section 13 & 14: Permission Enforcement in Streaming
    const userRole = chatContext.userContext.role;
    const permissions = chatContext.userContext.permissions;
    if (saasIntentAnalysis.requiresAction && !permissions.canDirectELMO) {
      const permissionMsg = `You currently have '${userRole}' permissions in ${chatContext.organization.name}. Your role permits viewing analytics, reports, and conversational inquiries, but executing actions or modifying assets requires 'member', 'admin', or 'owner' privileges.`;

      yield {
        event: "token",
        data: { text: permissionMsg },
      };

      await this.chatService.createMessage(
        params.userId,
        params.organizationId,
        {
          conversationId: convId,
          role: "assistant",
          content: permissionMsg,
          metadata: {
            input_mode: inputMode,
            role: userRole,
            permission_denied: true,
            status: "complete",
          },
        }
      );

      yield {
        event: "done",
        data: { status: "complete", permissionDenied: true },
      };
      return;
    }

    // Section 7: Ambiguity Handling in Streaming (Strict Priority Hierarchy)
    if (saasIntentAnalysis.userGoal?.ambiguityDetected) {
      const ambiguityResult = AmbiguityDetectorService.getInstance().resolveContextHierarchy({
        message: trimmedMessage,
        entities: saasIntentAnalysis.entities,
        companyBrainContext: {
          industry: (chatContext.businessContext as any)?.activeIndustry,
          targetAudience: (chatContext.businessContext as any)?.targetAudience,
          memories: chatContext.memories?.map((m) => ({ content: m })),
        },
        conversationContinuity: chatContext.activeContinuity as any,
      });

      if (ambiguityResult.isAmbiguous && ambiguityResult.clarificationQuestion) {
        const clarificationText = ambiguityResult.clarificationQuestion;
        yield {
          event: "token",
          data: { text: clarificationText },
        };

        await this.chatService.createMessage(
          params.userId,
          params.organizationId,
          {
            conversationId: convId,
            role: "assistant",
            content: clarificationText,
            metadata: {
              input_mode: inputMode,
              is_clarification: true,
              ambiguity_detected: true,
              status: "complete",
            },
          }
        );

        yield {
          event: "done",
          data: { status: "complete", isAmbiguous: true },
        };
        return;
      }
    }

    const funnelAgent = ElmoFunnelAgentService.getInstance();
    const hasPendingConfirmation = funnelAgent.hasPendingConfirmation(params.organizationId, params.userId);
    const lowerMessage = trimmedMessage.toLowerCase();
    const isFunnelAction =
      saasIntentAnalysis.requiresAction ||
      [
        "funnel_creation",
        "funnel_modification",
        "page_creation",
        "page_modification",
        "email_creation",
        "contact_management",
        "automation_request",
        "task_execution",
      ].includes(saasIntentAnalysis.intent);
    const isFunnelPlanOrRec =
      /(which funnel|what funnel|recommend|cadangkan|funnel apa sesuai|cadangan funnel)/i.test(lowerMessage) ||
      /(plan|design|blueprint|rangka|pelan|lakarkan)\s+(a\s+)?(funnel|webinar|campaign)/i.test(lowerMessage);
    const isFunnelSpecificQuestion =
      /(what should (our|the) (landing page|funnel|page) focus on|what should we focus on|focus of our landing page|apa fokus|what was our (previous|former|old) audience|previous audience)/i.test(
        lowerMessage
      ) ||
      ((lowerMessage.includes("focus on") || lowerMessage.includes("target audience") || lowerMessage.includes("core offer")) &&
       (saasIntentAnalysis.intent === "funnel_discussion" || saasIntentAnalysis.intent === "question"));

    const isMemoryCommand =
      saasIntentAnalysis.intent === "memory_store" ||
      saasIntentAnalysis.intent === "memory_forget" ||
      saasIntentAnalysis.intent === "memory_update" ||
      saasIntentAnalysis.intent === "memory_query";

    const isWebsiteOrCoding =
      !isDirectResponse &&
      (saasIntentAnalysis.intent === "website_creation" ||
       saasIntentAnalysis.intent === "page_creation" ||
       saasIntentAnalysis.intent === "website_modification" ||
       saasIntentAnalysis.intent === "component_creation" ||
       saasIntentAnalysis.intent === "code_generation" ||
       saasIntentAnalysis.intent === "preview_request" ||
       saasIntentAnalysis.intent === "funnel_creation" ||
       saasIntentAnalysis.intent === "planning" ||
       saasIntentAnalysis.intent === "task_execution" ||
       saasIntentAnalysis.intent === "goal_formulation" ||
       /\b(bina|buat|build|create|make|launch|design)\b.*\b(landing page|sales page|website|webpage|web app|crm|dashboard|portal|application|laman web|halaman)\b/i.test(
         lowerMessage
       ) ||
       /(build me a landing page|create me a landing page|create a landing page|build a complete website|build a website|bina landing page|make the hero|change the cta|mobile friendly|move testimonials|more premium|shorten the headline|add a lead form|dark mode)/i.test(
         lowerMessage
       ) ||
       /(launch a lead generation campaign|create a campaign to get more leads|lead generation campaign|get me more qualified leads|get more qualified leads|campaign for my business|research my competitors|kempen jana leads)/i.test(
         lowerMessage
       ) ||
       /(build a simple crm|crm dashboard|sales team dashboard|customer portal|internal tool)/i.test(
         lowerMessage
       ));

    if (isWebsiteOrCoding) {
      try {
        const orchestrator = ElmoOrchestratorService.getInstance();
        const orchRes = await orchestrator.orchestrate({
          userId: params.userId,
          organizationId: params.organizationId,
          conversationId: convId,
          message: trimmedMessage,
          intentAnalysis: saasIntentAnalysis,
          language: langCtx.responseLanguage,
          companyBrainContext: {
            organization: chatContext.organization,
            memories: chatContext.memories,
          },
        });

        if (!orchRes.isDirectAnswer) {
          // Emit plan step events for UI progress visibility
          if (orchRes.plan?.steps) {
            for (const step of orchRes.plan.steps) {
              yield {
                event: "plan_step",
                data: {
                  id: step.id,
                  stepNumber: step.stepNumber,
                  agentId: step.agentId,
                  agentName: step.agentName,
                  task: step.task,
                  status: step.status,
                  summary: step.summary,
                },
              };
            }
          }

          // Stream synthesized response tokens
          const words = orchRes.response.split(" ");
          for (let i = 0; i < words.length; i++) {
            if (params.abortSignal?.aborted) break;
            const token = i === words.length - 1 ? words[i] : words[i] + " ";
            yield { event: "token", data: { text: token } };
          }

          yield {
            event: "metadata",
            data: {
              elmoRequest,
              turnMode: "EXECUTION",
              visualState: orchRes.visualState,
              executionPlan: orchRes.plan,
              previewPayload: orchRes.previewPayload,
              pendingApproval: orchRes.pendingApproval,
              toolsExecuted: orchRes.agentResults.flatMap((r) => r.toolsUsed),
            },
          };

          const responseType: ResponseType = orchRes.pendingApproval ? "REQUIRES_APPROVAL" : "ANSWER";
          await this.chatService.createMessage(params.userId, params.organizationId, {
            conversationId: convId,
            role: "assistant",
            content: orchRes.response,
            metadata: {
              input_mode: inputMode,
              inputMethod: inputMode,
              voiced: inputMode === "voice",
              provider: "elmo-orchestrator",
              model: "gemini-2.5-flash",
              message_type: responseType,
              type: responseType,
              visual_state: orchRes.visualState,
              execution_plan: orchRes.plan,
              preview_payload: orchRes.previewPayload,
              pending_approval: orchRes.pendingApproval,
              language_code: langCtx.responseLanguage,
              language_name: langDetection.languageName,
              language_source: langDetection.source,
              language_confidence: langDetection.confidence,
              response_language: langCtx.responseLanguage,
              intent: langDetection.intent,
              saas_intent: saasIntentAnalysis.intent,
              is_translation: isTranslation,
              status: "complete",
              elmo_request: elmoRequest,
            },
          });

          return;
        }
      } catch (orchErr) {
        // Fall back to standard flow
      }
    }

    const shouldUseFunnelAgent =
      hasPendingConfirmation ||
      isDestructive ||
      isFunnelAction ||
      isFunnelPlanOrRec ||
      isFunnelSpecificQuestion ||
      isMemoryCommand;

    if (shouldUseFunnelAgent) {
      try {
        const agentResult = await funnelAgent.processDirective({
          userId: params.userId,
          organizationId: params.organizationId,
          conversationId: convId,
          message: trimmedMessage,
          languageContext: langCtx,
          inputMode,
        });

        const words = agentResult.response.split(" ");
        for (let i = 0; i < words.length; i++) {
          if (params.abortSignal?.aborted) break;
          const token = i === words.length - 1 ? words[i] : words[i] + " ";
          yield { event: "token", data: { text: token } };
        }

        yield {
          event: "metadata",
          data: {
            elmoRequest,
            turnMode: agentResult.turnMode,
            visualState: agentResult.visualState,
            toolsExecuted: agentResult.toolsExecuted.map((t) => t.tool),
            pendingConfirmation: agentResult.pendingConfirmation,
          },
        };

        const responseType = this.mapTurnModeToResponseType(agentResult.turnMode);
        await this.chatService.createMessage(params.userId, params.organizationId, {
          conversationId: convId,
          role: "assistant",
          content: agentResult.response,
          metadata: {
            input_mode: inputMode,
            inputMethod: inputMode,
            voiced: inputMode === "voice",
            provider: "elmo-funnel-agent",
            model: "gemini-2.5-flash",
            message_type: responseType,
            type: responseType,
            turn_mode: agentResult.turnMode,
            visual_state: agentResult.visualState,
            tools_executed: agentResult.toolsExecuted.map((t) => t.tool),
            language_code: langCtx.responseLanguage,
            language_name: langDetection.languageName,
            language_source: langDetection.source,
            language_confidence: langDetection.confidence,
            response_language: langCtx.responseLanguage,
            intent: langDetection.intent,
            saas_intent: saasIntentAnalysis.intent,
            is_translation: isTranslation,
            status: "complete",
            elmo_request: elmoRequest,
          },
        });

        yield { event: "done", data: "[DONE]" };
        return;
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        yield { event: "error", data: { error: errMessage } };
        return;
      }
    }

    let accumulatedText = "";
    let metadata: Record<string, unknown> = {};

    try {
      const streamGen = this.llmProvider.generateStream({
        prompt: trimmedMessage,
        systemInstruction: chatContext.systemInstruction,
        history: chatContext.recentMessages.slice(0, -1),
        abortSignal: params.abortSignal,
      });

      for await (const chunk of streamGen) {
        if (params.abortSignal?.aborted) {
          break;
        }

        if (chunk.type === "token" && chunk.text) {
          accumulatedText += chunk.text;
          yield { event: "token", data: { text: chunk.text } };
        } else if (chunk.type === "metadata" && chunk.metadata) {
          metadata = { ...metadata, ...chunk.metadata };
          yield { event: "metadata", data: chunk.metadata };
        } else if (chunk.type === "error") {
          console.warn("[ELMOIntelligenceService] Upstream provider error encountered in stream:", chunk.error);
          if (accumulatedText.trim().length === 0) {
            const fallbackText = GeminiService.getInstance().generateExecutiveFallbackResponse(
              trimmedMessage,
              chatContext.recentMessages
            );
            const words = fallbackText.split(/(\s+)/);
            for (const word of words) {
              if (params.abortSignal?.aborted) break;
              accumulatedText += word;
              yield { event: "token", data: { text: word } };
              await new Promise((res) => setTimeout(res, 15));
            }
          } else {
            yield { event: "error", data: { error: chunk.error || "Streaming error." } };
          }
        }
      }

      // 6. Yield metadata event with elmoRequest
      yield {
        event: "metadata",
        data: {
          ...metadata,
          elmoRequest,
          executionCategory: saasIntentAnalysis.executionCategory,
          intent: saasIntentAnalysis.intent,
        },
      };

      // 7. Persist assistant complete response
      if (accumulatedText.trim().length > 0) {
        const responseType = this.classifyResponseType(accumulatedText);
        await this.chatService.createMessage(params.userId, params.organizationId, {
          conversationId: convId,
          role: "assistant",
          content: accumulatedText,
          metadata: {
            ...metadata,
            input_mode: inputMode,
            inputMethod: inputMode,
            voiced: inputMode === "voice",
            provider: this.llmProvider.name,
            message_type: responseType,
            type: responseType,
            language_code: langCtx.responseLanguage,
            language_name: langDetection.languageName,
            language_source: langDetection.source,
            language_confidence: langDetection.confidence,
            response_language: langCtx.responseLanguage,
            intent: langDetection.intent,
            saas_intent: saasIntentAnalysis.intent,
            is_translation: isTranslation,
            status: "complete",
            elmo_request: elmoRequest,
          },
        });

        // Track usage
        this.recordUsage({
          organization_id: params.organizationId,
          user_id: params.userId,
          conversation_id: convId,
          provider: this.llmProvider.name,
          model: (metadata.model as string) || "gemini-1.5-flash",
          timestamp: Date.now(),
          inputTokens: Math.ceil(trimmedMessage.length / 4),
          outputTokens: Math.ceil(accumulatedText.length / 4),
          totalTokens: Math.ceil((trimmedMessage.length + accumulatedText.length) / 4),
          requestType: isTranslation ? "translation" : "streaming-conversation",
        });

        // Section 24 & 25: Publish telemetry and development logging
        const turnTelemetry: TurnTelemetry = {
          inputMode,
          userInput: trimmedMessage,
          detectedLanguage: langCtx.responseLanguage,
          languageCode: langCtx.responseLanguage,
          languageName: langDetection.languageName,
          confidence: langDetection.confidence,
          conversationId: convId,
          intent: langDetection.intent,
          saasIntent: saasIntentAnalysis.intent,
          isComplexTask: saasIntentAnalysis.isComplexTask,
          requiresAction: saasIntentAnalysis.requiresAction,
          suggestedTools: saasIntentAnalysis.suggestedTools,
          elmoResponse: accumulatedText,
          timestamp: Date.now(),
        };
        this.publishTelemetry(turnTelemetry);

        console.log(
          `[INPUT MODE]: ${inputMode.toUpperCase()}\n` +
          `[USER INPUT]: "${trimmedMessage}"\n` +
          `[DETECTED LANGUAGE]: ${langCtx.responseLanguage} (${langDetection.languageName})\n` +
          `[LANGUAGE CONFIDENCE]: ${langDetection.confidence}\n` +
          `[CONVERSATION ID]: ${convId}\n` +
          `[INTENT]: ${langDetection.intent} | SAAS: ${saasIntentAnalysis.intent}\n` +
          `[ELMO RESPONSE]: "${accumulatedText.slice(0, 100)}..."`
        );
      }

      yield { event: "done", data: "[DONE]" };
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      yield { event: "error", data: { error: errMessage } };
    }
  }

  /**
   * Classify ELMO response into internal structured response types
   */
  public classifyResponseType(text: string): ResponseType {
    const t = text.trim();
    if (t.includes("?")) {
      // Question or Clarification
      if (
        t.endsWith("?") ||
        t.includes("Boleh saya tahu") ||
        t.includes("Could you clarify") ||
        t.includes("请问") ||
        t.includes("でしょうか")
      ) {
        return "QUESTION";
      }
    }

    if (t.includes("### Plan") || t.includes("### Pelan") || t.includes("### 方案") || t.includes("Roadmap")) {
      return "PLAN";
    }

    if (t.includes("Requires Approval") || t.includes("Kelulusan Diperlukan") || t.includes("需要审批")) {
      return "REQUIRES_APPROVAL";
    }

    if (t.includes("Recommendation") || t.includes("Cadangan") || t.includes("建议") || t.includes("Sugerencia")) {
      return "SUGGESTION";
    }

    if (t.includes("Task") || t.includes("Tugasan") || t.includes("任务")) {
      return "TASK";
    }

    return "ANSWER";
  }

  public mapTurnModeToResponseType(turnMode: string): ResponseType {
    switch (turnMode) {
      case "INFORMATION":
        return "ANSWER";
      case "RECOMMENDATION":
        return "SUGGESTION";
      case "PLANNING":
        return "PLAN";
      case "EXECUTION":
      case "CONFIRMATION_EXECUTED":
        return "TASK";
      case "CONFIRMATION_REQUIRED":
        return "REQUIRES_APPROVAL";
      default:
        return "ANSWER";
    }
  }

  private verifyTenantMembership(userId: string, orgId: string): void {
    const store = MockDataStore.getInstance();
    if (!store.isOrgMember(userId, orgId)) {
      throw new Error(`Security Violation: User ${userId} is not authorized in organization ${orgId}.`);
    }
  }

  private recordUsage(record: AIUsageRecord): void {
    this.usageLog.push(record);
  }

  public getAIUsageHistory(orgId: string): AIUsageRecord[] {
    return this.usageLog.filter((r) => r.organization_id === orgId);
  }

  public clearUsageHistory(): void {
    this.usageLog = [];
  }

  private formatMarkdownBriefing(briefing: ExecutiveBriefing, orgName: string): string {
    const lines: string[] = [
      `# 🌅 Executive Morning Briefing: ${orgName}`,
      `**Date:** ${briefing.briefingDate} | **Status:** Optimal | **Period:** Previous 24 Hours`,
      "",
      "---",
      "",
      "### 📊 BUSINESS SNAPSHOT",
      `- **New Inbound Leads:** ${briefing.businessSnapshot.newLeadsCount}${briefing.businessSnapshot.leadVolumeChange.percentChange !== null ? ` (${briefing.businessSnapshot.leadVolumeChange.percentChange > 0 ? "+" : ""}${briefing.businessSnapshot.leadVolumeChange.percentChange}% vs prior period)` : ""}`,
      `- **New Contacts Captured:** ${briefing.businessSnapshot.newContactsCount}`,
      `- **Funnel Conversion Rate:** ${briefing.businessSnapshot.conversionChange.currentRate}% (${briefing.businessSnapshot.conversionChange.trend === "up" ? "↑ Improving" : briefing.businessSnapshot.conversionChange.trend === "down" ? "↓ Declining" : "→ Steady"})`,
      `- **Active Acquisition Funnels:** ${briefing.funnelHealth.activeFunnels.length}`,
    ];

    if (briefing.businessSnapshot.leadSources.length > 0) {
      const top = briefing.businessSnapshot.leadSources.map((s) => `${s.source}: ${s.count} (${s.percentage}%)`).join(" | ");
      lines.push(`- **Lead Sources:** ${top}`);
    }

    lines.push("", "---", "", '### ⚠️ ATTENTION REQUIRED ("Why It Matters")');
    if (
      briefing.priorityItems.length === 0 ||
      briefing.priorityItems.every((p) => p.category === "INFORMATION" || p.category === "POSITIVE_RESULT")
    ) {
      lines.push("No immediate blocking anomalies or critical alerts detected across your operations.");
    } else {
      for (const item of briefing.priorityItems
        .filter((p) => p.category === "ATTENTION_REQUIRED" || p.category === "WATCH")
        .slice(0, 3)) {
        lines.push(
          `#### 🔹 ${item.whatHappened}`,
          `- **Why It Matters:** ${item.whyItMatters}`,
          `- **Recommended Next Action:** ${item.recommendedAction}`,
          ""
        );
      }
    }

    lines.push("---", "", "### 🎯 TODAY'S FOCUS");
    if (briefing.todayFocus.length === 0) {
      lines.push("1. Review company roadmap and active sprint deliverables.");
    } else {
      briefing.todayFocus.forEach((focus, idx) => {
        lines.push(`${idx + 1}. **${focus.title}** — *${focus.reason}*`);
      });
    }

    lines.push(
      "",
      "---",
      "",
      "### 🤖 AI WORKFORCE & WORK STATUS",
      `- **Pending Approvals:** ${briefing.workStatus.pendingApprovals.length} item(s) awaiting executive decision`,
      `- **Overdue Tasks:** ${briefing.workStatus.overdueTasks.length} task(s)`,
      `- **Active AI Executions:** ${briefing.workStatus.activeExecutions.length} running autonomously`,
      `- **Autonomous Deliveries Completed:** ${briefing.workStatus.completedExecutions.length} deliverable(s)`
    );

    if (briefing.recommendations.length > 0) {
      lines.push("", "---", "", "### 💡 ELMO RECOMMENDS");
      for (const rec of briefing.recommendations.slice(0, 3)) {
        lines.push(`- **${rec.title}:** ${rec.description} *(Expected impact: ${rec.impact})*`);
      }
    }

    lines.push(
      "",
      "---",
      "",
      '*Reply with "Handle the funnel issue" or "Create the tasks" and ELMO will coordinate our specialist workforce to execute.*'
    );

    return lines.join("\n");
  }

}
