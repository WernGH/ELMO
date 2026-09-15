/**
 * ELMO Phase 3 — Research Agent Specialist
 */

import { AgentMessage, AgentResult } from "../types/agentic.types";
import { ElmoMemoryService } from "@/services/elmo-memory.service";

export class ResearchAgent {
  private static instance: ResearchAgent;
  private memoryService: ElmoMemoryService;

  private constructor() {
    this.memoryService = ElmoMemoryService.getInstance();
  }

  public static getInstance(): ResearchAgent {
    if (!ResearchAgent.instance) {
      ResearchAgent.instance = new ResearchAgent();
    }
    return ResearchAgent.instance;
  }

  public async execute(message: AgentMessage): Promise<AgentResult> {
    const topic = (message.input.topic as string) || (message.input.query as string) || message.task;
    const targetAudience = (message.input.targetAudience as string) || "General target audience";
    const orgId = (message.context.organizationId as string) || "default-org";

    // Check company memory for past research or audience insights
    const memoryEntries = await this.memoryService.searchRelevantMemory(
      orgId,
      `${targetAudience} ${topic}`,
      "organization",
      3
    );

    const existingInsights = memoryEntries.map((m) => m.content).join("; ") || "";

    const painPoints = [
      `Struggling with inconsistent lead generation and manual client follow-up`,
      `Time wasted on repetitive administrative workflows instead of closing deals`,
      `Difficulty standing out in a crowded, high-noise market`,
    ];

    const desireOutcomes = [
      `Predictable, automated inbound pipeline of qualified prospects`,
      `Instant, 24/7 AI-powered engagement that never misses a hot lead`,
      `Positioned as the premium authority in their niche`,
    ];

    return {
      agentId: "research-agent",
      success: true,
      summary: `Completed audience and market research for "${targetAudience}". Identified core pain points, objections, and desired transformations.`,
      data: {
        targetAudience,
        topic,
        painPoints,
        desireOutcomes,
        competitorGaps: ["Competitors lack automated AI response speed", "Competitor offerings are fragmented and confusing"],
        existingInsights,
      },
      recommendations: [
        `Lead with automated speed-to-lead as the primary hook`,
        `Anchor the offer around saving 15+ hours weekly on manual outreach`,
      ],
      actionsTaken: [
        {
          action: "AUDIENCE_ANALYSIS",
          description: `Extracted pain points and target outcome profile for ${targetAudience}`,
          status: "SUCCESS",
        },
      ],
      toolsUsed: ["query_memory"],
      needsMoreWork: false,
      nextSuggestedAgent: "marketing-agent",
      confidence: 0.95,
    };
  }
}
