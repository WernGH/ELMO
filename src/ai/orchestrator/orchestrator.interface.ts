import { AgentMessage, OrchestrationTask } from "@/types/future/orchestrator.types";

/**
 * Interface contract for Agent-to-Agent communication & task pipeline orchestrator (Phase 2+)
 */
export interface IAgentOrchestrator {
  dispatchTask(task: Omit<OrchestrationTask, "id" | "createdAt" | "updatedAt">): Promise<OrchestrationTask>;
  routeMessage(message: Omit<AgentMessage, "id" | "timestamp">): Promise<boolean>;
  getPendingTasks(organizationId: string): Promise<OrchestrationTask[]>;
}

export class AgentOrchestratorMockStub implements IAgentOrchestrator {
  async dispatchTask(task: Omit<OrchestrationTask, "id" | "createdAt" | "updatedAt">): Promise<OrchestrationTask> {
    return {
      ...task,
      id: `tsk-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async routeMessage(_message: Omit<AgentMessage, "id" | "timestamp">): Promise<boolean> {
    return true;
  }

  async getPendingTasks(_organizationId: string): Promise<OrchestrationTask[]> {
    return [];
  }
}
