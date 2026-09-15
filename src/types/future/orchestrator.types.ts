/**
 * Orchestrator and Agent-to-Agent Communication Protocol
 * For future phases: inter-agent messaging and task execution pipelines
 */

export interface AgentMessage {
  id: string;
  senderAgentId: string; // "ELMO" or specialist employee ID
  recipientAgentId: string; // "ELMO", specialist employee ID, or "broadcast"
  organizationId: string;
  topic: string;
  payload: Record<string, unknown>;
  timestamp: string;
  requiresAcknowledgment: boolean;
}

export interface OrchestrationTask {
  id: string;
  organizationId: string;
  goalId?: string;
  assignedToAgentId: string;
  title: string;
  instructions: string;
  dependencies: string[]; // IDs of tasks that must complete first
  status: "queued" | "in_progress" | "review_pending" | "completed" | "failed";
  outputArtifacts?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
