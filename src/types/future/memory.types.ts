/**
 * Company Memory & Vector Storage Types
 * For future phases: Semantic memory, episodic records, and organizational knowledge
 */

export type MemoryScope = "organization" | "agent_private" | "task_context" | "user" | "customer";

export interface MemoryEntry {
  id: string;
  organizationId: string;
  scope: MemoryScope;
  agentId?: string;
  content: string;
  embeddingModel?: string;
  metadata: Record<string, unknown>;
  importanceScore: number; // 0 to 1
  createdAt: string;
  lastAccessedAt: string;
}
