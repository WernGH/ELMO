/**
 * ELMO Phase 3 — Document Ingestion Service
 *
 * Implements the canonical ingestion pipeline:
 * DOCUMENT → EXTRACT → CLEAN → STRUCTURE → CHUNK → METADATA → EMBED → INDEX
 *
 * Supports document versioning, semantic section detection, and multi-tenant metadata tagging.
 */

import {
  KnowledgeDocument,
  KnowledgeChunk,
  DocumentIngestionInput,
} from "@/types/knowledge.types";
import { KnowledgeStoreService } from "./knowledge-store.service";

export class KnowledgeIngestionService {
  private static instance: KnowledgeIngestionService;
  private store: KnowledgeStoreService;

  private constructor() {
    this.store = KnowledgeStoreService.getInstance();
  }

  public static getInstance(): KnowledgeIngestionService {
    if (!KnowledgeIngestionService.instance) {
      KnowledgeIngestionService.instance = new KnowledgeIngestionService();
    }
    return KnowledgeIngestionService.instance;
  }

  public static resetInstance(): void {
    KnowledgeIngestionService.instance = new KnowledgeIngestionService();
  }

  /**
   * Ingests, processes, chunks, embeds, and indexes a business document.
   */
  public async ingestDocument(input: DocumentIngestionInput): Promise<{
    document: KnowledgeDocument;
    chunks: KnowledgeChunk[];
  }> {
    const orgId = input.organizationId;
    if (!orgId) {
      throw new Error("Cannot ingest document without a valid organizationId.");
    }
    if (!input.title || !input.content) {
      throw new Error("Document ingestion requires both title and content.");
    }

    // 1. EXTRACT & CLEAN
    const cleanedContent = this.cleanText(input.content);

    // 2. CHECK EXISTING VERSIONING
    const existingDocs = this.store.getDocumentsByOrg(orgId, { latestOnly: false });
    const matchingDoc = existingDocs.find(
      (d) =>
        (input.sourceId && d.sourceId === input.sourceId) ||
        d.title.trim().toLowerCase() === input.title.trim().toLowerCase()
    );

    const nextVersion = matchingDoc ? matchingDoc.version + 1 : 1;
    const documentId = matchingDoc ? matchingDoc.id : `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // 3. STRUCTURE & CHUNK
    const rawChunks = this.chunkContent(cleanedContent, {
      chunkSize: input.chunkSize || 250,
      chunkOverlap: input.chunkOverlap || 40,
    });

    const now = new Date().toISOString();

    // 4. METADATA & EMBED
    const chunks: KnowledgeChunk[] = rawChunks.map((rc, idx) => {
      const chunkId = `chk-${documentId}-v${nextVersion}-${idx}`;
      const tokenEst = Math.ceil(rc.text.split(/\s+/).length * 1.3);
      const keywords = this.extractKeywords(rc.text);
      const embedding = this.generateEmbedding(rc.text);

      return {
        id: chunkId,
        documentId,
        organizationId: orgId,
        version: nextVersion,
        chunkIndex: idx,
        content: rc.text,
        cleanContent: this.cleanText(rc.text),
        sectionTitle: rc.sectionTitle,
        tokenCount: tokenEst,
        embedding,
        keywords,
        metadata: {
          ...input.metadata,
          sourceType: input.sourceType,
          department: input.department,
        },
        createdAt: now,
      };
    });

    // 5. CONSTRUCT KNOWLEDGE DOCUMENT
    const document: KnowledgeDocument = {
      id: documentId,
      organizationId: orgId,
      sourceId: input.sourceId,
      sourceType: input.sourceType,
      title: input.title.trim(),
      description: input.description,
      version: nextVersion,
      isLatest: true,
      authorId: input.authorId,
      allowedRoles: input.allowedRoles || ["owner", "admin", "manager", "staff"],
      department: input.department,
      metadata: input.metadata,
      chunkCount: chunks.length,
      totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
      createdAt: matchingDoc ? matchingDoc.createdAt : now,
      updatedAt: now,
    };

    // 6. INDEX INTO STORAGE
    this.store.saveDocument(document);
    this.store.saveChunksBatch(chunks);

    return { document, chunks };
  }

  // ============================================================================
  // Helper Processing Methods
  // ============================================================================

  public cleanText(text: string): string {
    return text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /**
   * Chunks content preserving section headings (## or #) and maintaining overlap
   */
  public chunkContent(
    text: string,
    options: { chunkSize: number; chunkOverlap: number }
  ): Array<{ text: string; sectionTitle?: string }> {
    const lines = text.split("\n");
    const sections: Array<{ title?: string; body: string }> = [];

    let currentTitle: string | undefined = "General";
    let currentLines: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
      if (headingMatch) {
        if (currentLines.length > 0) {
          sections.push({
            title: currentTitle,
            body: currentLines.join("\n").trim(),
          });
          currentLines = [];
        }
        currentTitle = headingMatch[1].trim();
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      sections.push({
        title: currentTitle,
        body: currentLines.join("\n").trim(),
      });
    }

    const chunks: Array<{ text: string; sectionTitle?: string }> = [];

    for (const sec of sections) {
      if (!sec.body) continue;
      const words = sec.body.split(/\s+/);

      if (words.length <= options.chunkSize) {
        chunks.push({
          text: sec.title ? `## ${sec.title}\n\n${sec.body}` : sec.body,
          sectionTitle: sec.title,
        });
        continue;
      }

      // Sliding window over long sections
      let start = 0;
      while (start < words.length) {
        const end = Math.min(start + options.chunkSize, words.length);
        const chunkWords = words.slice(start, end).join(" ");
        const chunkContent = sec.title && start === 0
          ? `## ${sec.title}\n\n${chunkWords}`
          : chunkWords;

        chunks.push({
          text: chunkContent,
          sectionTitle: sec.title,
        });

        if (end >= words.length) break;
        start += options.chunkSize - options.chunkOverlap;
      }
    }

    // Fallback if no sections were identified
    if (chunks.length === 0 && text.trim().length > 0) {
      chunks.push({ text: text.trim() });
    }

    return chunks;
  }

  public extractKeywords(text: string): string[] {
    const stopWords = new Set([
      "the", "and", "is", "in", "to", "of", "a", "for", "with", "on", "as",
      "by", "at", "an", "be", "this", "which", "or", "from", "that", "our",
      "are", "your", "we", "can", "all", "has", "have", "it", "its", "dan",
      "yang", "di", "ini", "untuk", "dengan", "ke", "adalah"
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const freqMap = new Map<string, number>();
    for (const w of words) {
      freqMap.set(w, (freqMap.get(w) || 0) + 1);
    }

    return Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([w]) => w);
  }

  /**
   * Deterministic semantic embedding generation (768-dim normalized pseudo-vector
   * based on feature hashing with term frequency weighting).
   * Guarantees reproducible similarity scores without network latency or API rate limits.
   */
  public generateEmbedding(text: string, dim: number = 768): number[] {
    const vector = new Array(dim).fill(0);
    const tokens = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);

    if (tokens.length === 0) return vector;

    for (const token of tokens) {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const index = Math.abs(hash) % dim;
      const sign = (hash & 1) === 0 ? 1 : -1;
      vector[index] += sign * (1 + Math.log(token.length));
    }

    // L2 Normalize
    let norm = 0;
    for (let i = 0; i < dim; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < dim; i++) {
        vector[i] /= norm;
      }
    }

    return vector;
  }
}
