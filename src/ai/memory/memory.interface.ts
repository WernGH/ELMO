import { MemoryEntry, MemoryScope } from "@/types/future/memory.types";

/**
 * Interface contract for Company Memory & Knowledge Base (Phase 2+)
 */
export interface ICompanyMemoryEngine {
  storeMemory(entry: Omit<MemoryEntry, "id" | "createdAt" | "lastAccessedAt">): Promise<MemoryEntry>;
  searchRelevantMemory(
    organizationId: string,
    query: string,
    scope?: MemoryScope,
    limit?: number
  ): Promise<MemoryEntry[]>;
}

export class MemoryEngineMockStub implements ICompanyMemoryEngine {
  async storeMemory(entry: Omit<MemoryEntry, "id" | "createdAt" | "lastAccessedAt">): Promise<MemoryEntry> {
    return {
      ...entry,
      id: `mem-${Date.now()}`,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
    };
  }

  async searchRelevantMemory(
    _organizationId: string,
    _query: string,
    _scope?: MemoryScope,
    _limit = 5
  ): Promise<MemoryEntry[]> {
    return [];
  }
}
