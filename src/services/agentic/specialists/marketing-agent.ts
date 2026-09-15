/**
 * ELMO Phase 3 — Marketing Agent Specialist
 */

import { AgentMessage, AgentResult } from "../types/agentic.types";
import { ElmoMemoryService } from "@/services/elmo-memory.service";

export class MarketingAgent {
  private static instance: MarketingAgent;
  private memoryService: ElmoMemoryService;

  private constructor() {
    this.memoryService = ElmoMemoryService.getInstance();
  }

  public static getInstance(): MarketingAgent {
    if (!MarketingAgent.instance) {
      MarketingAgent.instance = new MarketingAgent();
    }
    return MarketingAgent.instance;
  }

  public async execute(message: AgentMessage): Promise<AgentResult> {
    const orgId = (message.context.organizationId as string) || "default-org";
    const businessType = (message.input.businessType as string) || (message.input.topic as string) || message.task;
    const targetAudience = (message.input.targetAudience as string) || "prospects";

    // Build positioning strategy
    const positioning = `The AI-native acceleration platform built exclusively for ${targetAudience} to automate lead capture and client acquisition.`;
    const valueProposition = `Stop losing hot prospects. Deploy an intelligent AI assistant that captures, qualifies, and follows up with ${targetAudience} in seconds.`;
    
    const offerBlueprint = {
      primaryOffer: `All-in-One AI Lead & Client Growth System`,
      coreBenefits: [
        `24/7 Instant Lead Qualification without human intervention`,
        `Automated Multi-Channel Follow-up that books calendar meetings directly`,
        `Zero Technical Headaches — fully configured and ready in 48 hours`,
      ],
      leadMagnet: `Free Growth Audit & 7-Day Pilot Blueprint`,
      pricingAngle: `Value-anchored investment with guaranteed ROI within 30 days`,
    };

    // Save key marketing decision to company memory
    await this.memoryService.storeMemory({
      organizationId: orgId,
      scope: "organization",
      content: `Target Audience: ${targetAudience}. Positioning: ${positioning}`,
      importanceScore: 0.8,
      metadata: { category: "marketing_strategy", source: "marketing_agent" },
    });

    return {
      agentId: "marketing-agent",
      success: true,
      summary: `Defined marketing positioning and offer architecture for ${targetAudience}.`,
      data: {
        positioning,
        valueProposition,
        offerBlueprint,
        targetAudience,
        businessType,
      },
      recommendations: [
        `Use a high-converting lead capture hook with social proof`,
        `Position the solution as an unfair advantage against traditional competitors`,
      ],
      actionsTaken: [
        {
          action: "POSITIONING_FORMULATION",
          description: `Established core value proposition for ${targetAudience}`,
          status: "SUCCESS",
        },
        {
          action: "MEMORY_PERSISTENCE",
          description: "Saved marketing strategy to organization memory",
          status: "SUCCESS",
        },
      ],
      toolsUsed: ["store_memory"],
      needsMoreWork: false,
      nextSuggestedAgent: "copy-agent",
      confidence: 0.95,
    };
  }
}
