/**
 * ELMO Phase 3 — Agent Executor Service (AgentExecutorService)
 *
 * Executes individual agent turns with permission verification, execution limits,
 * and structured message handling.
 */

import { AgentMessage, AgentResult } from "./types/agentic.types";
import { AgentRegistryService } from "./agent-registry.service";
import { ResearchAgent } from "./specialists/research-agent";
import { MarketingAgent } from "./specialists/marketing-agent";
import { CopyAgent } from "./specialists/copy-agent";
import { FunnelAdapterAgent } from "./specialists/funnel-adapter-agent";
import { AnalyticsAgent } from "./specialists/analytics-agent";
import { WebCodingAgentService } from "./web-coding/web-coding-agent.service";

export class AgentExecutorService {
  private static instance: AgentExecutorService;
  private registry: AgentRegistryService;

  private constructor() {
    this.registry = AgentRegistryService.getInstance();
  }

  public static getInstance(): AgentExecutorService {
    if (!AgentExecutorService.instance) {
      AgentExecutorService.instance = new AgentExecutorService();
    }
    return AgentExecutorService.instance;
  }

  /**
   * Executes an agent task under controlled runtime conditions.
   */
  public async executeAgent(message: AgentMessage): Promise<AgentResult> {
    const agentDef = this.registry.getAgent(message.recipient);

    if (!agentDef) {
      return {
        agentId: message.recipient,
        success: false,
        summary: `Execution Error: Unknown agent "${message.recipient}"`,
        data: {},
        recommendations: [],
        actionsTaken: [],
        toolsUsed: [],
        needsMoreWork: false,
        confidence: 0,
        errors: [`Agent "${message.recipient}" is not registered.`],
      };
    }

    if (!agentDef.enabled) {
      return {
        agentId: message.recipient,
        success: false,
        summary: `Execution Error: Agent "${agentDef.name}" is currently disabled.`,
        data: {},
        recommendations: [],
        actionsTaken: [],
        toolsUsed: [],
        needsMoreWork: false,
        confidence: 0,
        errors: [`Agent "${agentDef.name}" is disabled by policy.`],
      };
    }

    try {
      switch (agentDef.id) {
        case "research-agent":
          return await ResearchAgent.getInstance().execute(message);

        case "marketing-agent":
          return await MarketingAgent.getInstance().execute(message);

        case "copy-agent":
          return await CopyAgent.getInstance().execute(message);

        case "funnel-agent":
          return await FunnelAdapterAgent.getInstance().execute(message);

        case "web-coding-agent":
          return await WebCodingAgentService.getInstance().execute(message);

        case "analytics-agent":
          return await AnalyticsAgent.getInstance().execute(message);

        default:
          return {
            agentId: agentDef.id,
            success: false,
            summary: `No runtime handler registered for agent "${agentDef.id}".`,
            data: {},
            recommendations: [],
            actionsTaken: [],
            toolsUsed: [],
            needsMoreWork: false,
            confidence: 0,
            errors: [`Handler missing for agent "${agentDef.id}".`],
          };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        agentId: agentDef.id,
        success: false,
        summary: `Execution failed on agent "${agentDef.name}": ${errMsg}`,
        data: {},
        recommendations: ["Review error logs and retry with refined parameters."],
        actionsTaken: [],
        toolsUsed: [],
        needsMoreWork: true,
        confidence: 0,
        errors: [errMsg],
      };
    }
  }
}
