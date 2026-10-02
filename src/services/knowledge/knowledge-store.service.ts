/**
 * ELMO Phase 3 — Knowledge Store Service
 *
 * Provider-agnostic storage abstraction for Knowledge Documents & Vector Chunks.
 * Enforces strict multi-tenant isolation, version tracking, and deterministic retrieval.
 */

import {
  KnowledgeDocument,
  KnowledgeChunk,
  KnowledgeSourceType,
} from "@/types/knowledge.types";

export class KnowledgeStoreService {
  private static instance: KnowledgeStoreService;

  // Multi-tenant document repository: Map<documentId, KnowledgeDocument>
  private documents: Map<string, KnowledgeDocument> = new Map();
  // Multi-tenant chunk repository: Map<chunkId, KnowledgeChunk>
  private chunks: Map<string, KnowledgeChunk> = new Map();

  private constructor() {}

  public static getInstance(): KnowledgeStoreService {
    if (!KnowledgeStoreService.instance) {
      KnowledgeStoreService.instance = new KnowledgeStoreService();
    }
    return KnowledgeStoreService.instance;
  }

  public static resetInstance(): void {
    KnowledgeStoreService.instance = new KnowledgeStoreService();
  }

  /**
   * Resets all in-memory knowledge data (used for clean testing)
   */
  public reset(): void {
    this.documents.clear();
    this.chunks.clear();
  }

  public clearAll(): void {
    this.reset();
  }

  // ============================================================================
  // Document Operations
  // ============================================================================

  /**
   * Stores a document, handling versioning and older version supersession.
   */
  public saveDocument(doc: KnowledgeDocument): void {
    // If a document with the same organizationId and (sourceId or title) exists, supersede previous versions
    for (const [existingId, existingDoc] of this.documents.entries()) {
      if (
        existingDoc.organizationId === doc.organizationId &&
        (existingDoc.id === doc.id ||
          (doc.sourceId && existingDoc.sourceId === doc.sourceId) ||
          existingDoc.title.toLowerCase() === doc.title.toLowerCase())
      ) {
        if (existingDoc.version < doc.version) {
          existingDoc.isLatest = false;
          existingDoc.updatedAt = new Date().toISOString();
        }
      }
    }

    this.documents.set(doc.id, { ...doc });
  }

  public getDocument(organizationId: string, documentId: string): KnowledgeDocument | null {
    const doc = this.documents.get(documentId);
    if (!doc || doc.organizationId !== organizationId) {
      return null;
    }
    return { ...doc };
  }

  public getDocumentsByOrg(
    organizationId: string,
    options?: { latestOnly?: boolean; sourceType?: KnowledgeSourceType }
  ): KnowledgeDocument[] {
    const results: KnowledgeDocument[] = [];
    const latestOnly = options?.latestOnly ?? true;

    for (const doc of this.documents.values()) {
      if (doc.organizationId !== organizationId) continue;
      if (latestOnly && !doc.isLatest) continue;
      if (options?.sourceType && doc.sourceType !== options.sourceType) continue;
      results.push({ ...doc });
    }

    return results;
  }

  public deleteDocument(organizationId: string, documentId: string): boolean {
    const doc = this.documents.get(documentId);
    if (!doc || doc.organizationId !== organizationId) {
      return false;
    }

    this.documents.delete(documentId);

    // Also delete associated chunks
    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (chunk.documentId === documentId && chunk.organizationId === organizationId) {
        this.chunks.delete(chunkId);
      }
    }

    return true;
  }

  // ============================================================================
  // Chunk Operations
  // ============================================================================

  public saveChunk(chunk: KnowledgeChunk): void {
    this.chunks.set(chunk.id, { ...chunk });
  }

  public saveChunksBatch(chunks: KnowledgeChunk[]): void {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, { ...chunk });
    }
  }

  public getChunksByDocument(organizationId: string, documentId: string): KnowledgeChunk[] {
    const results: KnowledgeChunk[] = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.organizationId === organizationId && chunk.documentId === documentId) {
        results.push({ ...chunk });
      }
    }
    return results.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  public getChunksByOrg(organizationId: string): KnowledgeChunk[] {
    const results: KnowledgeChunk[] = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.organizationId === organizationId) {
        results.push({ ...chunk });
      }
    }
    return results;
  }

  /**
   * Diagnostic statistics for the knowledge store
   */
  public getStats(organizationId?: string): { totalDocs: number; totalChunks: number; orgDocs: number } {
    let orgDocs = 0;
    let orgChunks = 0;

    for (const doc of this.documents.values()) {
      if (!organizationId || doc.organizationId === organizationId) {
        orgDocs++;
      }
    }

    for (const chunk of this.chunks.values()) {
      if (!organizationId || chunk.organizationId === organizationId) {
        orgChunks++;
      }
    }

    return {
      totalDocs: this.documents.size,
      totalChunks: this.chunks.size,
      orgDocs: organizationId ? orgDocs : this.documents.size,
    };
  }
}
