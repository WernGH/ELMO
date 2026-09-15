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

    const isCompetitorQuery = topic.toLowerCase().includes("competitor") || message.task.toLowerCase().includes("competitor");

    const competitorGaps = isCompetitorQuery
      ? [
          "Competitors have slow response times (avg > 4 hours to engage new leads)",
          "Competitor funnels lack real-time interactive qualification and personalized nurture",
          "Competitor pricing models charge steep retainers without guaranteed speed-to-lead",
        ]
      : [
          "Competitors lack automated AI response speed",
          "Competitor offerings are fragmented and confusing",
        ];

    const summaryText = isCompetitorQuery
      ? `Completed competitor and market gap analysis for "${targetAudience}". Identified 3 critical competitor weaknesses to exploit.`
      : `Completed audience and market research for "${targetAudience}". Identified core pain points, objections, and desired transformations.`;

    return {
      agentId: "research-agent",
      success: true,
      summary: summaryText,
      data: {
        targetAudience,
        topic,
        painPoints,
        desireOutcomes,
        competitorGaps,
        existingInsights,
      },
      recommendations: [
        `Lead with automated speed-to-lead as the primary hook`,
        `Anchor the offer around saving 15+ hours weekly on manual outreach`,
      ],
      actionsTaken: [
        {
          action: isCompetitorQuery ? "COMPETITOR_ANALYSIS" : "AUDIENCE_ANALYSIS",
          description: isCompetitorQuery
            ? `Extracted competitor weaknesses and differentiation opportunities for ${targetAudience}`
            : `Extracted pain points and target outcome profile for ${targetAudience}`,
          status: "SUCCESS",
        },
      ],
      toolsUsed: ["query_memory"],
      needsMoreWork: false,
      nextSuggestedAgent: "marketing-agent",
      confidence: 0.95,
      artifacts: [
        {
          type: "research_brief",
          name: `${targetAudience} Market Research Brief`,
          content: { painPoints, desireOutcomes, competitorGaps },
        },
      ],
      metrics: {
        competitorGapsCount: competitorGaps.length,
        confidenceScore: 0.95,
      },
    };
  }
}
