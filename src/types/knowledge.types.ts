/**
 * ELMO Phase 3 — Knowledge Retrieval / RAG Contract & Type Definitions
 *
 * Implements strict schemas for:
 * 1. Document Ingestion & Versioning
 * 2. Chunking with Section & Token Metadata
 * 3. Permission-Aware & Multi-Tenant Retrieval Queries
 * 4. Hybrid Search (Semantic + Lexical) Scoring
 * 5. Source Provenance & Knowledge Confidence
 * 6. Context Assembly Hierarchy
 */

export type KnowledgeSourceType =
  | "sop"
  | "manual"
  | "policy"
  | "product_doc"
  | "service_doc"
  | "training_material"
  | "internal_kb"
  | "uploaded_file"
  | "website_content"
  | "research_doc"
  | "external_approved";

export type KnowledgeConfidence =
  | "retrieved"
  | "inferred"
  | "user_provided"
  | "verified"
  | "unverified";

export interface KnowledgeDocument {
  id: string;
  organizationId: string;
  sourceId?: string;
  sourceType: KnowledgeSourceType;
  title: string;
  description?: string;
  version: number;
  isLatest: boolean;
  authorId?: string;
  allowedRoles?: string[]; // e.g. ["owner", "admin", "manager", "staff"]
  department?: string;
  metadata?: Record<string, unknown>;
  chunkCount: number;
  totalTokens?: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  organizationId: string;
  version: number;
  chunkIndex: number;
  content: string;
  cleanContent: string;
  sectionTitle?: string;
  tokenCount: number;
  embedding?: number[];
  keywords?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface RetrievalQuery {
  query: string;
  organizationId: string;
  userId?: string;
  userRole?: string;
  sourceTypes?: KnowledgeSourceType[];
  documentIds?: string[];
  categories?: string[];
  department?: string;
  minScore?: number; // Minimum relevance threshold (default: 0.35)
  limit?: number; // Maximum chunks to retrieve (default: 5)
  topK?: number; // Convenience alias for limit
  hybridAlpha?: number; // 1.0 = pure vector, 0.0 = pure keyword, 0.6 = balanced hybrid
  includeOutdatedVersions?: boolean; // Defaults to false
}

export interface SourceProvenance {
  documentId: string;
  documentTitle: string;
  documentVersion: number;
  sourceType: KnowledgeSourceType;
  sectionTitle?: string;
  chunkId: string;
  relevanceScore: number;
  retrievalMethod: "semantic" | "keyword" | "hybrid";
  contentSnippet?: string;
}

export interface RetrievedChunk {
  chunk: KnowledgeChunk;
  relevanceScore: number;
  semanticScore: number;
  keywordScore: number;
  provenance: SourceProvenance;
  confidence: KnowledgeConfidence;
}

export interface KnowledgeContext {
  organizationId: string;
  query: string;
  retrievedCount: number;
  items: RetrievedChunk[];
  chunks: KnowledgeChunk[];
  provenance: SourceProvenance[];
  sourceCitations: string[]; // Formatted citations for ELMO to explain source provenance
  formattedContext: string; // Formatted markdown block ready for LLM prompt injection
  retrievedAt: number;
  knowledgeConfidence: KnowledgeConfidence;
}

export interface DocumentIngestionInput {
  organizationId: string;
  title: string;
  content: string;
  sourceType: KnowledgeSourceType;
  sourceId?: string;
  description?: string;
  authorId?: string;
  allowedRoles?: string[];
  department?: string;
  metadata?: Record<string, unknown>;
  chunkSize?: number; // Target words per chunk (default: 250)
  chunkOverlap?: number; // Overlapping words (default: 40)
}
