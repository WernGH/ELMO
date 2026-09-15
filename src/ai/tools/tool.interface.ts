/**
 * Interface contract for Tool Registry & Execution (Phase 2+)
 */
export interface IAgentTool {
  name: string;
  description: string;
  parametersSchema: Record<string, unknown>;
  execute(params: Record<string, unknown>, context: { organizationId: string; agentId: string }): Promise<unknown>;
}

export interface IToolRegistry {
  registerTool(tool: IAgentTool): void;
  getTool(name: string): IAgentTool | undefined;
  listTools(): Array<{ name: string; description: string }>;
}
