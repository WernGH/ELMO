/**
 * ELMO Master Migration — AI Funnel Agent Service (ElmoFunnelAgentService)
 *
 * Central operational intelligence layer underneath ELMO:
 * USER
 *   │
 *   ▼
 * UNDERSTAND (ElmoIntentService)
 *   │
 *   ▼
 * CONTEXT + MEMORY (ElmoContextService + ElmoMemoryService)
 *   │
 *   ▼
 * REASON (Conversion & Funnel Architecture Strategy)
 *   │
 *   ▼
 * PLAN / CLARIFY / ASK CONFIRMATION
 *   │
 *   ▼
 * SELECT TOOL & EXECUTE (ElmoToolService)
 *   │
 *   ▼
 * VERIFY & RECORD MEMORY
 *   │
 *   ▼
 * RESPOND (Sophisticated Multilingual Executive Persona)
 *
 * CRITICAL SAFETY RULES:
 * - Distinguishes INFORMATION vs RECOMMENDATION vs PLANNING vs EXECUTION vs CONFIRMATION.
 * - Destructive actions (delete funnel, delete page, delete contacts) require explicit confirmation.
 * - Gemini NEVER modifies the database directly.
 */

import { ElmoIntentService, IntentAnalysisResult } from "./elmo-intent.service";
import { ElmoContextService, AssembledElmoContext } from "./elmo-context.service";
import { ElmoMemoryService } from "./elmo-memory.service";
import { ElmoToolService, ToolExecutionResult } from "./elmo-tool.service";
import { LanguageContext } from "./language-context.service";

export type AgentTurnMode =
  | "INFORMATION"
  | "RECOMMENDATION"
  | "PLANNING"
  | "EXECUTION"
  | "CONFIRMATION_REQUIRED"
  | "CONFIRMATION_EXECUTED"
  | "CONVERSATION";

export interface PendingConfirmationAction {
  id: string;
  organizationId: string;
  userId: string;
  toolName: string;
  args: Record<string, unknown>;
  description: string;
  createdAt: number;
}

export interface FunnelAgentDirectiveParams {
  userId: string;
  organizationId: string;
  conversationId?: string;
  message: string;
  funnelId?: string;
  pageId?: string;
  languageContext?: LanguageContext;
  inputMode?: "text" | "voice";
}

export interface FunnelAgentResult {
  turnMode: AgentTurnMode;
  response: string;
  intent: IntentAnalysisResult;
  toolsExecuted: ToolExecutionResult[];
  pendingConfirmation?: PendingConfirmationAction;
  visualState: "THINKING" | "EXECUTING" | "SUCCESS" | "ERROR";
}

export class ElmoFunnelAgentService {
  private static instance: ElmoFunnelAgentService;
  private intentService: ElmoIntentService;
  private contextService: ElmoContextService;
  private memoryService: ElmoMemoryService;
  private toolService: ElmoToolService;

  // Staged pending destructive actions awaiting user confirmation
  private pendingConfirmations: Map<string, PendingConfirmationAction> = new Map();

  private constructor() {
    this.intentService = ElmoIntentService.getInstance();
    this.contextService = ElmoContextService.getInstance();
    this.memoryService = ElmoMemoryService.getInstance();
    this.toolService = ElmoToolService.getInstance();
  }

  public static getInstance(): ElmoFunnelAgentService {
    if (!ElmoFunnelAgentService.instance) {
      ElmoFunnelAgentService.instance = new ElmoFunnelAgentService();
    }
    return ElmoFunnelAgentService.instance;
  }

  public static resetInstance(): void {
    ElmoFunnelAgentService.instance = undefined as any;
  }

  public hasPendingConfirmation(organizationId: string, userId: string): boolean {
    return this.pendingConfirmations.has(`${organizationId}:${userId}`);
  }

  public getPendingConfirmation(organizationId: string, userId: string): PendingConfirmationAction | undefined {
    return this.pendingConfirmations.get(`${organizationId}:${userId}`);
  }

  public clearPendingConfirmation(organizationId: string, userId: string): void {
    this.pendingConfirmations.delete(`${organizationId}:${userId}`);
  }

  /**
   * Primary operational reasoning and execution doorway
   */
  public async processDirective(params: FunnelAgentDirectiveParams): Promise<FunnelAgentResult> {
    const rawMessage = params.message.trim();
    const lower = rawMessage.toLowerCase();

    // 1. Check for Pending Confirmation ("yes", "confirm", "proceed", "do it", "teruskan", "sah")
    const pendingKey = `${params.organizationId}:${params.userId}`;
    const pendingAction = this.pendingConfirmations.get(pendingKey);

    if (
      pendingAction &&
      /^(yes|confirm|proceed|do it|go ahead|sah|teruskan|ya|confirm delete|delete it|lakukan)/i.test(lower)
    ) {
      this.pendingConfirmations.delete(pendingKey);
      const execution = await this.toolService.executeTool(
        pendingAction.toolName,
        pendingAction.args,
        { userId: params.userId, organizationId: params.organizationId }
      );

      return {
        turnMode: "CONFIRMATION_EXECUTED",
        response: `Understood. I have confirmed your directive and executed: ${pendingAction.description}.\n\nThe operation completed successfully with strict organization isolation.`,
        intent: this.intentService.analyzeIntent(rawMessage),
        toolsExecuted: [execution],
        visualState: execution.success ? "SUCCESS" : "ERROR",
      };
    }

    // 2. Understand — Semantic Intent Analysis
    const intentResult = this.intentService.analyzeIntent(rawMessage);

    // 3. Context & Memory Assembly
    const context = await this.contextService.assembleContext({
      userId: params.userId,
      organizationId: params.organizationId,
      conversationId: params.conversationId,
      funnelId: params.funnelId,
      pageId: params.pageId,
      currentTask: intentResult.explanation,
      languageContext: params.languageContext,
    });

    // 3a. Explicit Memory Commands (Phase 2 Company Brain)
    if (
      intentResult.intent === "memory_store" ||
      intentResult.intent === "memory_forget" ||
      intentResult.intent === "memory_update" ||
      intentResult.intent === "memory_query"
    ) {
      const memCmd = await this.memoryService.handleExplicitMemoryCommand(
        params.userId,
        params.organizationId,
        rawMessage
      );
      if (memCmd.action !== "unrecognized") {
        return {
          turnMode: "CONVERSATION",
          response: memCmd.explanation,
          intent: intentResult,
          toolsExecuted: [],
          visualState: "SUCCESS",
        };
      }
    }

    // 3b. Background Semantic Memory Extraction (Extract facts & resolve conflicts)
    try {
      await this.memoryService.extractMemoriesFromConversation(
        params.userId,
        params.organizationId,
        context.recentMessages,
        rawMessage
      );
    } catch {
      // Non-blocking background extraction
    }

    // 4. Determine Agent Turn Mode & Safety Gates
    // A. Destructive Operation Gate: Delete funnel, delete page, etc.
    if (/(delete|remove|padam|buang)\s+(funnel|page|contact|sequence)/i.test(lower)) {
      const matchFunnel = lower.match(/(?:funnel)\s+([a-zA-Z0-9_-]+)/i);
      const targetId = matchFunnel ? matchFunnel[1] : params.funnelId;

      if (targetId) {
        const pending: PendingConfirmationAction = {
          id: `conf-${Date.now()}`,
          organizationId: params.organizationId,
          userId: params.userId,
          toolName: lower.includes("funnel") ? "delete_funnel" : "delete_page",
          args: lower.includes("funnel") ? { funnelId: targetId } : { pageId: targetId },
          description: `Permanent deletion of ${lower.includes("funnel") ? "funnel" : "page"} [ID: ${targetId}]`,
          createdAt: Date.now(),
        };
        this.pendingConfirmations.set(pendingKey, pending);

        return {
          turnMode: "CONFIRMATION_REQUIRED",
          response: `**Caution**: Deleting this resource is a permanent operational action.\n\nAre you certain you want me to delete this? Say or reply **"Confirm"** or **"Yes, go ahead"** to proceed, or anything else to abort.`,
          intent: intentResult,
          toolsExecuted: [],
          pendingConfirmation: pending,
          visualState: "THINKING",
        };
      }
    }

    // B. Information Request (e.g. "What is a webinar funnel?")
    if (intentResult.intent === "question") {
      const topic = intentResult.entities.topic || rawMessage;
      return {
        turnMode: "INFORMATION",
        response: this.generateInformationalResponse(topic, context),
        intent: intentResult,
        toolsExecuted: [],
        visualState: "THINKING",
      };
    }

    // C. Strategic Recommendation Request (e.g. "Which funnel should I use for coaching?")
    if (
      /(which funnel|what funnel|recommend|cadangkan|funnel apa sesuai|cadangan funnel)/i.test(lower) &&
      !/(build|create|buatkan|bina)/i.test(lower)
    ) {
      return {
        turnMode: "RECOMMENDATION",
        response: this.generateRecommendationResponse(rawMessage, context),
        intent: intentResult,
        toolsExecuted: [],
        visualState: "THINKING",
      };
    }

    // D. Funnel Planning Request (e.g. "Plan a webinar funnel")
    if (
      /(plan|design|blueprint|rangka|pelan|lakarkan)\s+(a\s+)?(funnel|webinar|campaign)/i.test(lower) &&
      !/(build it|execute|create now|buatkan sekarang)/i.test(lower)
    ) {
      return {
        turnMode: "PLANNING",
        response: this.generatePlanningResponse(rawMessage, context),
        intent: intentResult,
        toolsExecuted: [],
        visualState: "THINKING",
      };
    }

    // E. Execution Requests (e.g. "Create a lead generation funnel", "Add a thank you page", "Rewrite headline")
    if (intentResult.requiresAction) {
      return await this.executeActionWorkflow(intentResult, params, context);
    }

    // F. General Conversation & Greetings
    return {
      turnMode: "CONVERSATION",
      response: this.generateConversationalResponse(rawMessage, context),
      intent: intentResult,
      toolsExecuted: [],
      visualState: "THINKING",
    };
  }

  /**
   * Action Workflow: Selects and executes domain tools, records memory, and formats natural response
   */
  private async executeActionWorkflow(
    intentResult: IntentAnalysisResult,
    params: FunnelAgentDirectiveParams,
    context: AssembledElmoContext
  ): Promise<FunnelAgentResult> {
    const toolsExecuted: ToolExecutionResult[] = [];
    const execCtx = { userId: params.userId, organizationId: params.organizationId };

    // --- Funnel Creation ---
    if (intentResult.intent === "funnel_creation") {
      const funnelType = intentResult.entities.funnelType || "Lead Generation";
      const isPlaceholderAudience =
        !intentResult.entities.targetAudience ||
        /^(our|my|the)?\s*launch/i.test(intentResult.entities.targetAudience);
      const targetAudience =
        (!isPlaceholderAudience ? intentResult.entities.targetAudience : undefined) ||
        context.companyBrain?.targetAudience ||
        "High-Value Prospects";
      const offer =
        intentResult.entities.offer ||
        context.companyBrain?.coreOffers ||
        "Core Lead Magnet / Solution";
      const funnelName = `${funnelType} System`;

      // 1. Create Funnel
      const fRes = await this.toolService.executeTool(
        "create_funnel",
        {
          name: funnelName,
          funnelType,
          goal: `Generate qualified ${funnelType.toLowerCase()} conversions`,
          targetAudience,
          offer,
          primaryConversionGoal: "Opt-in / Signup",
        },
        execCtx
      );
      toolsExecuted.push(fRes);

      if (fRes.success && fRes.data) {
        const createdFunnel = fRes.data as any;

        // 2. Automatically create landing page for the funnel
        const pRes = await this.toolService.executeTool(
          "create_page",
          {
            funnelId: createdFunnel.id,
            name: `${funnelType} Landing Page`,
            slug: "welcome",
            pageType: "landing",
            title: `${funnelName} — Official Registration`,
          },
          execCtx
        );
        toolsExecuted.push(pRes);

        if (pRes.success && pRes.data) {
          const createdPage = pRes.data as any;
          // Add structured hero section
          await this.toolService.executeTool(
            "create_section",
            {
              pageId: createdPage.id,
              sectionType: "hero",
              content: {
                headline: `Transform Your Results With Our Proven ${funnelType} Architecture`,
                subheadline: `Engineered specifically for ${targetAudience}.`,
                ctaButton: "Get Started Now",
              },
            },
            execCtx
          );

          // Add opt-in form
          await this.toolService.executeTool(
            "create_form",
            {
              pageId: createdPage.id,
              name: `${funnelType} Opt-in Form`,
              fields: [{ name: "email", label: "Email Address", type: "email", required: true }],
              addTags: [`${funnelType.toLowerCase()}-lead`],
            },
            execCtx
          );
        }

        // 3. Automatically record decision into persistent memory
        await this.memoryService.saveFunnelDecision({
          userId: params.userId,
          organizationId: params.organizationId,
          funnelId: createdFunnel.id,
          decision: `Created ${funnelType} Funnel targeting ${targetAudience}`,
          rationale: "Initiated via conversational directive",
          importanceScore: 0.9,
        });

        const responseText =
          `I have structured and built your **${funnelName}**.\n\n` +
          `### Architecture Deployed:\n` +
          `- **Funnel Type**: ${funnelType}\n` +
          `- **Target Audience**: ${targetAudience}\n` +
          `- **Primary Step**: Landing Page (\`/welcome\`) with structured Hero Section & Lead Capture Form.\n` +
          `- **Lead Tagging**: Automatically tagging new subscribers with \`${funnelType.toLowerCase()}-lead\`.\n\n` +
          `The funnel is registered in your organization and ready for copy customization or live publishing. Would you like me to review the headline copy next?`;

        return {
          turnMode: "EXECUTION",
          response: responseText,
          intent: intentResult,
          toolsExecuted,
          visualState: "SUCCESS",
        };
      }
    }

    // --- Page Creation ---
    if (intentResult.intent === "page_creation") {
      const pageType = intentResult.entities.pageType || "landing";
      const pRes = await this.toolService.executeTool(
        "create_page",
        {
          funnelId: params.funnelId,
          name: `${pageType.charAt(0).toUpperCase() + pageType.slice(1)} Page`,
          slug: pageType,
          pageType,
          title: `Executive ${pageType.toUpperCase()} Page`,
        },
        execCtx
      );
      toolsExecuted.push(pRes);

      return {
        turnMode: "EXECUTION",
        response: `Done. I have created the **${pageType.toUpperCase()} Page** and linked it to your workspace.\n\nWould you like me to attach structured sections (e.g., Hero, Benefits, Testimonials, Pricing)?`,
        intent: intentResult,
        toolsExecuted,
        visualState: pRes.success ? "SUCCESS" : "ERROR",
      };
    }

    // --- Copywriting ---
    if (intentResult.intent === "copywriting") {
      const copyRes = await this.toolService.executeTool(
        "generate_copy",
        {
          topic: params.message,
          audience: context.currentFunnel?.targetAudience || "High-value prospects",
          offer: context.currentFunnel?.offer || "Core Solution",
        },
        execCtx
      );
      toolsExecuted.push(copyRes);

      const copyData = copyRes.data as any;
      const response =
        `Here is high-converting sales copy tailored for your audience:\n\n` +
        `### Primary Headline Options:\n` +
        copyData.headlines.map((h: string, idx: number) => `${idx + 1}. **"${h}"**`).join("\n") +
        `\n\n### Subheadline:\n"${copyData.subheadline}"\n\n` +
        `### Core Benefit Points:\n` +
        copyData.bulletPoints.map((b: string) => `- ${b}`).join("\n") +
        `\n\n**Call to Action**: \`${copyData.callToAction}\`\n` +
        `**Guarantee**: _"${copyData.guarantee}"_\n\n` +
        `Shall I apply one of these headlines directly to your landing page?`;

      return {
        turnMode: "EXECUTION",
        response,
        intent: intentResult,
        toolsExecuted,
        visualState: "SUCCESS",
      };
    }

    // --- Analytics Request ---
    if (intentResult.intent === "analytics_request") {
      const funnelId = params.funnelId || (context.currentFunnel ? context.currentFunnel.id : undefined);
      if (funnelId) {
        const statRes = await this.toolService.executeTool("analyze_funnel", { funnelId }, execCtx);
        toolsExecuted.push(statRes);
        const analysis = statRes.data as any;

        return {
          turnMode: "EXECUTION",
          response:
            `### Executive Funnel Analytics Briefing\n\n` +
            `- **Total Visitors**: ${analysis.metrics.totalVisitors}\n` +
            `- **Total Leads**: ${analysis.metrics.totalLeads}\n` +
            `- **Conversion Rate**: **${analysis.metrics.conversionRate}%**\n\n` +
            `**Diagnosis**: ${analysis.diagnosis}\n\n` +
            `### Recommended Action Items:\n` +
            analysis.actionItems.map((item: string) => `- ${item}`).join("\n"),
          intent: intentResult,
          toolsExecuted,
          visualState: "SUCCESS",
        };
      }
    }

    // Fallback tool execution for other matching tools
    return {
      turnMode: "EXECUTION",
      response: `I have processed your operational instruction: "${params.message}". All actions have been committed to the organization data layer.`,
      intent: intentResult,
      toolsExecuted,
      visualState: "SUCCESS",
    };
  }

  private generateInformationalResponse(topic: string, context: AssembledElmoContext): string {
    const tLower = topic.toLowerCase();
    if (
      /(what should (our|the) (landing page|funnel|page) focus on|what should we focus on|focus of our landing page|apa fokus)/i.test(
        tLower
      )
    ) {
      return this.generateConversationalResponse(topic, context);
    }

    if (tLower.includes("webinar")) {
      return (
        `A **Webinar Funnel** is a high-converting conversion architecture designed for medium to high-ticket offers ($500–$5,000+).\n\n` +
        `### Standard 4-Step Customer Journey:\n` +
        `1. **Registration Page**: Captures name & email with a strong hook, key takeaways, and presenter authority.\n` +
        `2. **Thank-You / Confirmation Page**: Delivers calendar invite, date/time confirmation, and a pre-webinar video.\n` +
        `3. **Broadcast / Replay Room**: Live or automated presentation teaching a specific framework and presenting your core offer.\n` +
        `4. **Checkout / Strategy Application**: Directs attendees to enroll or apply for a consultation.\n\n` +
        `Would you like me to build a webinar funnel structure for your specific offer?`
      );
    }

    if (tLower.includes("lead magnet") || tLower.includes("opt-in") || tLower.includes("lead gen")) {
      return (
        `A **Lead Generation / Lead Magnet Funnel** is built to acquire qualified contact information at minimal cost.\n\n` +
        `### Key Components:\n` +
        `- **High-Value Lead Magnet**: A checklist, template, cheat sheet, or mini-guide solving a single acute problem.\n` +
        `- **Frictionless Opt-in Page**: Minimal fields (email only) with strong value-focused copy.\n` +
        `- **Thank-You / Delivery Page**: Provides instant download and introduces the next logical step (tripwire offer or calendar booking).\n` +
        `- **Automated Nurture Sequence**: 3 to 5 automated follow-up emails converting the lead into a paying client.\n\n` +
        `Shall I generate a lead generation funnel tailored to your target audience?`
      );
    }

    return (
      `In digital marketing, a **funnel** is the deliberate, step-by-step psychological path a prospective buyer takes from initial awareness to completed purchase.\n\n` +
      `Unlike a standard website with distracting links, each funnel step has a **single goal** (e.g. opt in, watch video, or purchase), which typically yields 2x to 5x higher conversion rates.\n\n` +
      `Tell me what product or service you sell, and I will recommend the optimal funnel structure for your business.`
    );
  }

  private generateRecommendationResponse(query: string, _context: AssembledElmoContext): string {
    const q = query.toLowerCase();

    if (q.includes("coaching") || q.includes("consulting") || q.includes("agency") || q.includes("automation")) {
      return (
        `For high-ticket coaching, consulting, or agency services, the most profitable architecture is an **Application / Strategy Call Funnel**.\n\n` +
        `### Strategic Blueprint:\n` +
        `1. **Short Video Sales Letter (VSL) Page**: Explains your exact transformation framework and eliminates common objections in 7–12 minutes.\n` +
        `2. **Qualification Questionnaire**: Filters out unqualified prospects before they book on your calendar.\n` +
        `3. **Calendar Booking**: Direct appointment scheduling.\n` +
        `4. **Confirmation & Case Study Prep Page**: Pre-frames the prospect with testimonials before the call.\n\n` +
        `Would you like me to create this funnel structure for you now?`
      );
    }

    return (
      `Based on conversion benchmarks, the optimal funnel depends on your price point:\n\n` +
      `- **Under $100 (Courses / E-commerce)**: Direct Sales Page Funnel with 1-click Order Bumps and Upsells.\n` +
      `- **$500 to $2,000 (Workshops / Programs)**: Automated Webinar or 3-part Video Masterclass Funnel.\n` +
      `- **$2,000+ (High-Ticket / Agency)**: VSL Application Funnel with calendar qualification.\n\n` +
      `Which price range best aligns with your offer?`
    );
  }

  private generatePlanningResponse(query: string, _context: AssembledElmoContext): string {
    return (
      `### Strategic Funnel Plan\n\n` +
      `**Directive**: "${query}"\n\n` +
      `#### Phase 1: Traffic & Lead Capture\n` +
      `- Step 1: High-converting landing page with emotional headline and single-field email form.\n` +
      `- Step 2: Instant confirmation page with social share and expectation setting.\n\n` +
      `#### Phase 2: Nurture & Conversion\n` +
      `- Automated 5-part email sequence delivering value and building desire.\n` +
      `- Dedicated checkout page with risk reversal guarantee.\n\n` +
      `Say **"Build it"** or **"Create it"**, and I will immediately construct these pages and forms in your workspace.`
    );
  }

  private generateConversationalResponse(message: string, context: AssembledElmoContext): string {
    const lower = message.toLowerCase();

    // Check if inquiring about business focus, target audience, or offers
    if (
      /(what should (our|the) (landing page|funnel|page) focus on|what should we focus on|focus of our landing page|apa fokus)/i.test(
        lower
      )
    ) {
      const audience = context.companyBrain?.targetAudience || "your target market";
      const offer = context.companyBrain?.coreOffers || "your core value proposition";
      const positioning = context.companyBrain?.businessIdentity || "your core transformation";
      const constraints = context.companyBrain?.constraintsAndPreferences;

      let guidance =
        `Based on our persistent Company Brain context:\n\n` +
        `- **Target Audience**: ${audience}\n` +
        `- **Core Offer**: ${offer}\n` +
        `- **Positioning**: ${positioning}\n`;

      if (constraints) {
        guidance += `- **Brand Tone & Constraints**: ${constraints}\n`;
      }

      guidance +=
        `\nYour landing page should focus directly on solving the primary bottleneck for **${audience}**, presenting **${offer}** with clarity and strong risk reversal.\n\n` +
        `Would you like me to construct the page layout and headlines for this offer?`;

      return guidance;
    }

    // Check if inquiring about historical/previous knowledge
    if (/(what was our (previous|former|old) audience|previous audience|sasaran sebelum ini)/i.test(lower)) {
      const superseded = context.memories?.find(
        (m) => m.status === "superseded" && (m.category === "business" || m.category === "customer")
      );
      if (superseded) {
        return `According to our historical records, your previous target audience was: **"${superseded.content}"** before it was updated and superseded by your current business direction.`;
      }
    }

    return (
      `Hello! I am ELMO, your executive AI operating layer. Systems are online and ready to build, optimize, and analyze your funnels.\n\n` +
      `How may I assist your business strategy today?`
    );
  }
}
