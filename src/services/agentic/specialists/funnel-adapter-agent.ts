/**
 * ELMO Phase 3 — Funnel Adapter Agent
 *
 * Integrates the existing ElmoFunnelAgentService into the Agentic Engine.
 * Reuses all existing funnel creation, stage sequencing, and safety gates.
 */

import { AgentMessage, AgentResult } from "../types/agentic.types";
import { ElmoFunnelAgentService } from "@/services/elmo-funnel-agent.service";

export class FunnelAdapterAgent {
  private static instance: FunnelAdapterAgent;
  private existingFunnelAgent: ElmoFunnelAgentService;

  private constructor() {
    this.existingFunnelAgent = ElmoFunnelAgentService.getInstance();
  }

  public static getInstance(): FunnelAdapterAgent {
    if (!FunnelAdapterAgent.instance) {
      FunnelAdapterAgent.instance = new FunnelAdapterAgent();
    }
    return FunnelAdapterAgent.instance;
  }

  public async execute(message: AgentMessage): Promise<AgentResult> {
    const userId = (message.context.userId as string) || "00000000-0000-0000-0000-000000000001";
    const orgId = (message.context.organizationId as string) || "11111111-1111-1111-1111-111111111111";

    const directiveRes = await this.existingFunnelAgent.processDirective({
      userId,
      organizationId: orgId,
      message: message.task || (message.input.message as string) || "plan funnel structure",
    });

    return {
      agentId: "funnel-agent",
      success: directiveRes.visualState !== "ERROR",
      summary: directiveRes.response,
      data: {
        turnMode: directiveRes.turnMode,
        visualState: directiveRes.visualState,
        intent: directiveRes.intent,
        toolsExecuted: directiveRes.toolsExecuted,
        pendingConfirmation: directiveRes.pendingConfirmation,
      },
      recommendations: [
        "Connect the landing page form to automated nurture sequence",
        "Set up an analytics tracking milestone on the final thank-you page",
      ],
      actionsTaken: directiveRes.toolsExecuted.map((t) => ({
        action: t.tool,
        description: `Executed funnel tool ${t.tool}`,
        status: t.success ? "SUCCESS" : "FAILED",
      })),
      toolsUsed: directiveRes.toolsExecuted.map((t) => t.tool),
      needsMoreWork: !!directiveRes.pendingConfirmation,
      nextSuggestedAgent: "web-coding-agent",
      confidence: 0.95,
      errors: directiveRes.visualState === "ERROR" ? [directiveRes.response] : undefined,
    };
  }
}
