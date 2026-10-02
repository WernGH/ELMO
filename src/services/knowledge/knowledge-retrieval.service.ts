/**
 * ELMO Phase 3 — Knowledge Retrieval & Hybrid Search Service
 *
 * Implements the modular retrieval pipeline:
 * QUERY → FILTER → HYBRID RETRIEVAL → RELEVANCE CHECK → RERANK → PROVENANCE → CONTEXT ASSEMBLY
 *
 * Enforces strict multi-tenant RLS, role-based document access, version filtering,
 * and provenance preservation.
 */

import {
  RetrievalQuery,
  RetrievedChunk,
  KnowledgeContext,
  SourceProvenance,
  KnowledgeConfidence,
  KnowledgeChunk,
  KnowledgeDocument,
} from "@/types/knowledge.types";
import { KnowledgeStoreService } from "./knowledge-store.service";
import { KnowledgeIngestionService } from "./knowledge-ingestion.service";

export class KnowledgeRetrievalService {
  private static instance: KnowledgeRetrievalService;
  private store: KnowledgeStoreService;
  private ingestion: KnowledgeIngestionService;

  private constructor() {
    this.store = KnowledgeStoreService.getInstance();
    this.ingestion = KnowledgeIngestionService.getInstance();
  }

  public static getInstance(): KnowledgeRetrievalService {
    if (!KnowledgeRetrievalService.instance) {
      KnowledgeRetrievalService.instance = new KnowledgeRetrievalService();
    }
    return KnowledgeRetrievalService.instance;
  }

  public static resetInstance(): void {
    KnowledgeRetrievalService.instance = new KnowledgeRetrievalService();
  }

  /**
   * Executes goal-aware hybrid knowledge retrieval with permission and version filtering.
   */
  public async retrieve(query: RetrievalQuery): Promise<KnowledgeContext> {
    const orgId = query.organizationId;
    if (!orgId) {
      throw new Error("Cannot retrieve knowledge without a valid organizationId.");
    }

    const minScore = query.minScore ?? 0.25;
    const limit = query.limit ?? query.topK ?? 5;
    const alpha = query.hybridAlpha ?? 0.6; // 60% semantic, 40% lexical
    const includeOutdated = query.includeOutdatedVersions ?? false;

    // 1. Fetch chunks isolated strictly to the tenant's organization
    const orgChunks = this.store.getChunksByOrg(orgId);
    if (orgChunks.length === 0) {
      return this.emptyContext(orgId, query.query);
    }

    // 2. Fetch all org documents to evaluate permissions and versioning
    const orgDocs = this.store.getDocumentsByOrg(orgId, { latestOnly: !includeOutdated });
    const docMap = new Map<string, KnowledgeDocument>();
    for (const d of orgDocs) {
      docMap.set(d.id, d);
    }

    // 3. Filter eligible chunks by document existence, permissions, and metadata
    const eligibleChunks = orgChunks.filter((chunk) => {
      const doc = docMap.get(chunk.documentId);
      if (!doc) return false;

      // Version filter: must match current doc version if latestOnly
      if (!includeOutdated && chunk.version !== doc.version) {
        return false;
      }

      // Specific document filter
      if (query.documentIds && query.documentIds.length > 0) {
        if (!query.documentIds.includes(chunk.documentId)) return false;
      }

      // Source type filter
      if (query.sourceTypes && query.sourceTypes.length > 0) {
        if (!query.sourceTypes.includes(doc.sourceType)) return false;
      }

      // Department filter
      if (query.department && doc.department && doc.department !== query.department) {
        return false;
      }

      // Role-based permission check
      if (query.userRole && doc.allowedRoles && doc.allowedRoles.length > 0) {
        const normalizedRole = query.userRole.toLowerCase();
        const roleAllowed = doc.allowedRoles.some(
          (r) => r.toLowerCase() === normalizedRole || r === "*"
        );
        if (!roleAllowed) return false;
      }

      return true;
    });

    if (eligibleChunks.length === 0) {
      return this.emptyContext(orgId, query.query);
    }

    // 4. Generate query embedding and query keywords
    const queryEmbedding = this.ingestion.generateEmbedding(query.query);
    const queryTokens = this.ingestion.extractKeywords(query.query);

    // 5. Score chunks via Hybrid Scoring
    const scoredChunks: RetrievedChunk[] = [];

    for (const chunk of eligibleChunks) {
      const doc = docMap.get(chunk.documentId)!;

      // Semantic Cosine Similarity
      const semanticScore = chunk.embedding
        ? this.cosineSimilarity(queryEmbedding, chunk.embedding)
        : 0;

      // Lexical Keyword Matching Score
      const keywordScore = this.calculateKeywordScore(queryTokens, chunk, doc.title);

      // Hybrid Fusion Score
      const standardHybrid = alpha * semanticScore + (1 - alpha) * keywordScore;
      const hybridScore = Math.max(
        standardHybrid,
        keywordScore * 0.75 + semanticScore * 0.25,
        keywordScore >= 0.25 ? keywordScore : 0
      );

      // Filter by threshold cutoff
      if (hybridScore >= minScore) {
        const method: "semantic" | "keyword" | "hybrid" =
          semanticScore > 0.8 && keywordScore < 0.2
            ? "semantic"
            : keywordScore > 0.8 && semanticScore < 0.2
            ? "keyword"
            : "hybrid";

        const confidence: KnowledgeConfidence =
          hybridScore >= 0.75
            ? "verified"
            : hybridScore >= 0.5
            ? "retrieved"
            : "unverified";

        const provenance: SourceProvenance = {
          documentId: doc.id,
          documentTitle: doc.title,
          documentVersion: doc.version,
          sourceType: doc.sourceType,
          sectionTitle: chunk.sectionTitle,
          chunkId: chunk.id,
          relevanceScore: Number(hybridScore.toFixed(3)),
          retrievalMethod: method,
          contentSnippet: chunk.cleanContent || chunk.content,
        };

        scoredChunks.push({
          chunk,
          relevanceScore: Number(hybridScore.toFixed(3)),
          semanticScore: Number(semanticScore.toFixed(3)),
          keywordScore: Number(keywordScore.toFixed(3)),
          provenance,
          confidence,
        });
      }
    }

    // 6. Rerank and Top-K Truncation
    scoredChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topItems = scoredChunks.slice(0, limit);

    if (topItems.length === 0) {
      return this.emptyContext(orgId, query.query);
    }

    // 7. Assemble Source Provenance & Citations
    const citations = this.generateCitations(topItems);
    const formattedContext = this.formatContextMarkdown(topItems);

    const overallConfidence: KnowledgeConfidence =
      topItems[0].relevanceScore >= 0.75
        ? "verified"
        : topItems[0].relevanceScore >= 0.5
        ? "retrieved"
        : "unverified";

    return {
      organizationId: orgId,
      query: query.query,
      retrievedCount: topItems.length,
      items: topItems,
      chunks: topItems.map((item) => item.chunk),
      provenance: topItems.map((item) => item.provenance),
      sourceCitations: citations,
      formattedContext,
      retrievedAt: Date.now(),
      knowledgeConfidence: overallConfidence,
    };
  }

  // ============================================================================
  // Scoring & Math Functions
  // ============================================================================

  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, sim));
  }

  public calculateKeywordScore(queryTokens: string[], chunk: KnowledgeChunk, docTitle?: string): number {
    if (queryTokens.length === 0) return 0;

    const chunkText = (
      chunk.cleanContent +
      " " +
      (chunk.sectionTitle || "") +
      " " +
      (docTitle || "")
    ).toLowerCase();
    let matches = 0;

    for (const token of queryTokens) {
      if (chunkText.includes(token)) {
        matches++;
      }
    }

    const baseScore = matches / queryTokens.length;

    // Bonus for document title or section title match
    let bonus = 0;
    if (docTitle && queryTokens.some((t) => docTitle.toLowerCase().includes(t))) {
      bonus += 0.25;
    }
    if (
      chunk.sectionTitle &&
      queryTokens.some((t) => chunk.sectionTitle!.toLowerCase().includes(t))
    ) {
      bonus += 0.15;
    }

    return Math.min(1, baseScore + bonus);
  }

  // ============================================================================
  // Formatting & Provenance Assembly
  // ============================================================================

  private generateCitations(items: RetrievedChunk[]): string[] {
    const citationSet = new Set<string>();
    for (const item of items) {
      const p = item.provenance;
      const sectionPart = p.sectionTitle ? ` (Section: "${p.sectionTitle}")` : "";
      citationSet.add(
        `"${p.documentTitle}" v${p.documentVersion}${sectionPart} [Match: ${(item.relevanceScore * 100).toFixed(0)}%]`
      );
    }
    return Array.from(citationSet);
  }

  private formatContextMarkdown(items: RetrievedChunk[]): string {
    const parts: string[] = [
      "### Retrieved Unstructured Business Knowledge (RAG Layer):",
      "> *Note: Use this verified organizational knowledge to ground your response with exact source provenance.*",
      "",
    ];

    for (const [idx, item] of items.entries()) {
      const p = item.provenance;
      parts.push(
        `#### [Source ${idx + 1}] ${p.documentTitle} (v${p.documentVersion})${p.sectionTitle ? ` — ${p.sectionTitle}` : ""}`
      );
      parts.push(`*Relevance: ${(item.relevanceScore * 100).toFixed(0)}% | Confidence: ${item.confidence}*`);
      parts.push("```text");
      parts.push(item.chunk.content);
      parts.push("```");
      parts.push("");
    }

    return parts.join("\n");
  }

  private emptyContext(orgId: string, query: string): KnowledgeContext {
    return {
      organizationId: orgId,
      query,
      retrievedCount: 0,
      items: [],
      chunks: [],
      provenance: [],
      sourceCitations: [],
      formattedContext: "",
      retrievedAt: Date.now(),
      knowledgeConfidence: "unverified",
    };
  }
}
