/**
 * ELMO Phase 3 — Knowledge Retrieval / RAG Engine Test Suite
 *
 * Validates:
 * 1. Document Ingestion Pipeline: EXTRACT -> CLEAN -> STRUCTURE -> CHUNK -> METADATA -> EMBED -> INDEX
 * 2. Sliding window chunking with section headers and token estimations
 * 3. Multi-Tenant data isolation (Tenant A cannot access Tenant B knowledge)
 * 4. Role-based access filtering (staff cannot retrieve executive-only docs)
 * 5. Document versioning & supersession (v2 supersedes v1 by default)
 * 6. Hybrid retrieval scoring (semantic cosine similarity + lexical keyword matching)
 * 7. Source provenance & citation generation (accurate document citations, no hallucinations)
 * 8. Irrelevant query guardrail (low-scoring queries return unverified/empty context)
 * 9. Tool Registry integration with "search_knowledge"
 */

import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeStoreService } from "@/services/knowledge/knowledge-store.service";
import { KnowledgeIngestionService } from "@/services/knowledge/knowledge-ingestion.service";
import { KnowledgeRetrievalService } from "@/services/knowledge/knowledge-retrieval.service";
import { ToolRegistryService } from "@/services/agentic/tool-registry.service";

describe("ELMO Phase 3 — Knowledge Retrieval / RAG Engine", () => {
  let store: KnowledgeStoreService;
  let ingestion: KnowledgeIngestionService;
  let retrieval: KnowledgeRetrievalService;
  let toolRegistry: ToolRegistryService;

  beforeEach(() => {
    store = KnowledgeStoreService.getInstance();
    store.clearAll();
    ingestion = KnowledgeIngestionService.getInstance();
    retrieval = KnowledgeRetrievalService.getInstance();
    toolRegistry = ToolRegistryService.getInstance();
  });

  describe("1. Ingestion Pipeline & Chunking", () => {
    it("should clean, structure, chunk, and embed a document into the knowledge store", async () => {
      const docInput = {
        organizationId: "org-restaurant-1",
        title: "Bistro Operations Standard Operating Procedure",
        sourceType: "sop" as const,
        authorId: "user-chef-1",
        allowedRoles: ["owner", "manager", "staff"],
        content: `
# Kitchen Opening Protocol
All kitchen staff must sanitize prep stations at 07:00. Verify refrigeration temperatures are between 2 and 4 degrees Celsius.
Inspect all incoming seafood deliveries and log freshness grades into the daily food safety ledger.

# Food Allergy & Cross-Contamination Standard
Peanut and shellfish preparation stations must remain strictly segregated.
Any dish prepared for guests with identified severe allergies must use dedicated red prep boards and color-coded chef knives.

# Closing & Waste Management
Record remaining perishable inventory into the kitchen inventory terminal.
Compost organic kitchen trimmings and lock storage freezers before departure.
        `,
      };

      const result = await ingestion.ingestDocument(docInput);

      expect(result.document).toBeDefined();
      expect(result.document.title).toBe("Bistro Operations Standard Operating Procedure");
      expect(result.document.version).toBe(1);
      expect(result.document.isLatest).toBe(true);
      expect(result.document.chunkCount).toBeGreaterThanOrEqual(2);
      expect(result.chunks.length).toBe(result.document.chunkCount);

      // Verify chunk structure
      const firstChunk = result.chunks[0];
      expect(firstChunk.organizationId).toBe("org-restaurant-1");
      expect(firstChunk.tokenCount).toBeGreaterThan(0);
      expect(firstChunk.embedding).toBeDefined();
      expect(firstChunk.embedding?.length).toBe(768);
      expect(firstChunk.keywords).toBeDefined();
      expect(firstChunk.keywords?.length).toBeGreaterThan(0);
    });

    it("should gracefully handle short single-paragraph documents", async () => {
      const result = await ingestion.ingestDocument({
        organizationId: "org-saas-1",
        title: "Refund Policy",
        sourceType: "policy",
        content: "Customers may request a full refund within 14 days of account upgrade with no questions asked.",
      });

      expect(result.chunks.length).toBe(1);
      expect(result.chunks[0].cleanContent).toContain("refund within 14 days");
      expect(result.chunks[0].sectionTitle).toBe("General");
    });
  });

  describe("2. Multi-Tenant Isolation & Role-Based Permissions", () => {
    beforeEach(async () => {
      // Organization A: Insurance Co
      await ingestion.ingestDocument({
        organizationId: "org-insurance-a",
        title: "Comprehensive Cyber Insurance Policy Handbook",
        sourceType: "policy",
        allowedRoles: ["owner", "admin"],
        content: `
# Underwriting Criteria
Cyber liability coverage requires mandatory multi-factor authentication (MFA) on all remote employee access points.
Deductibles are set at $25,000 for ransomware response and $10,000 for data breach forensic audits.
        `,
      });

      // Organization B: Property Agency
      await ingestion.ingestDocument({
        organizationId: "org-property-b",
        title: "Luxury Condo Commission & Escrow Guidelines",
        sourceType: "sop",
        allowedRoles: ["owner", "agent"],
        content: `
# Commission Schedules
Standard seller agent commission is 3% upon successful title deed transfer and escrow clearing.
        `,
      });
    });

    it("should strictly enforce multi-tenant isolation (Tenant B cannot see Tenant A docs)", async () => {
      // Query Org B for cyber insurance (exists only in Org A)
      const queryTenantB = await retrieval.retrieve({
        query: "What are the cyber insurance deductibles and MFA requirements?",
        organizationId: "org-property-b",
      });

      expect(queryTenantB.retrievedCount).toBe(0);
      expect(queryTenantB.items.length).toBe(0);
      expect(queryTenantB.knowledgeConfidence).toBe("unverified");

      // Query Org A for cyber insurance
      const queryTenantA = await retrieval.retrieve({
        query: "What are the cyber insurance deductibles and MFA requirements?",
        organizationId: "org-insurance-a",
        userRole: "admin",
      });

      expect(queryTenantA.retrievedCount).toBeGreaterThan(0);
      expect(queryTenantA.items[0].provenance.documentTitle).toContain("Cyber Insurance");
      expect(queryTenantA.items[0].chunk.content).toContain("multi-factor authentication");
    });

    it("should filter out documents when user role does not match allowedRoles", async () => {
      // Staff querying executive-only document
      const staffQuery = await retrieval.retrieve({
        query: "ransomware response deductible",
        organizationId: "org-insurance-a",
        userRole: "staff", // Not in ["owner", "admin"]
      });

      expect(staffQuery.retrievedCount).toBe(0);

      // Admin querying same document
      const adminQuery = await retrieval.retrieve({
        query: "ransomware response deductible",
        organizationId: "org-insurance-a",
        userRole: "admin",
      });

      expect(adminQuery.retrievedCount).toBeGreaterThan(0);
      expect(adminQuery.items[0].provenance.relevanceScore).toBeGreaterThan(0.35);
    });
  });

  describe("3. Document Versioning & Supersession", () => {
    it("should supersede previous document versions and retrieve only latest by default", async () => {
      // Ingest Version 1
      await ingestion.ingestDocument({
        organizationId: "org-coaching-1",
        title: "Executive Mastermind Pricing Guide",
        sourceType: "product_doc",
        content: "The VIP Executive Mastermind tier is priced at $3,000 per quarter with bi-weekly sessions.",
      });

      // Ingest Version 2 with updated price
      await ingestion.ingestDocument({
        organizationId: "org-coaching-1",
        title: "Executive Mastermind Pricing Guide",
        sourceType: "product_doc",
        content: "The VIP Executive Mastermind tier is now priced at $4,500 per quarter with weekly sessions.",
      });

      // Query latest
      const latestResult = await retrieval.retrieve({
        query: "How much is the VIP Executive Mastermind tier?",
        organizationId: "org-coaching-1",
      });

      expect(latestResult.retrievedCount).toBe(1);
      expect(latestResult.items[0].chunk.version).toBe(2);
      expect(latestResult.items[0].chunk.content).toContain("$4,500");
      expect(latestResult.items[0].chunk.content).not.toContain("$3,000");

      // Query with includeOutdatedVersions enabled
      const allVersionsResult = await retrieval.retrieve({
        query: "VIP Executive Mastermind tier pricing history",
        organizationId: "org-coaching-1",
        includeOutdatedVersions: true,
      });

      expect(allVersionsResult.retrievedCount).toBe(2);
    });
  });

  describe("4. Hybrid Retrieval & Source Provenance Citations", () => {
    beforeEach(async () => {
      await ingestion.ingestDocument({
        organizationId: "org-ecommerce-1",
        title: "Return & Exchange Policy",
        sourceType: "policy",
        content: `
# 30-Day Return Guarantee
Items in original, unworn condition with tags attached may be returned within 30 days of courier delivery.
Refunds will be issued to the original payment method within 5 business days of warehouse receipt.

# Final Sale Exceptions
Discounted clearance items marked as 'Final Sale' and custom monogrammed apparel cannot be returned or refunded.
        `,
      });
    });

    it("should assemble structured source provenance without hallucinating citations", async () => {
      const result = await retrieval.retrieve({
        query: "What items cannot be returned according to our return policy?",
        organizationId: "org-ecommerce-1",
        minScore: 0.25,
      });

      expect(result.retrievedCount).toBeGreaterThanOrEqual(1);
      expect(result.sourceCitations.length).toBeGreaterThanOrEqual(1);
      expect(result.sourceCitations[0]).toContain("Return & Exchange Policy");
      expect(result.formattedContext).toContain("[Source 1] Return & Exchange Policy");
      expect(result.formattedContext).toContain("Final Sale");

      const topItem = result.items[0];
      expect(topItem.provenance.documentTitle).toBe("Return & Exchange Policy");
      expect(topItem.provenance.sourceType).toBe("policy");
      expect(topItem.provenance.relevanceScore).toBeGreaterThan(0.25);
      expect(topItem.confidence).toBeDefined();
    });

    it("should guardrail against irrelevant queries by returning empty/unverified context", async () => {
      const irrelevantResult = await retrieval.retrieve({
        query: "Quantum physics gravitational wave interferometer specifications",
        organizationId: "org-ecommerce-1",
        minScore: 0.4,
      });

      expect(irrelevantResult.retrievedCount).toBe(0);
      expect(irrelevantResult.knowledgeConfidence).toBe("unverified");
      expect(irrelevantResult.sourceCitations.length).toBe(0);
    });
  });

  describe("5. Tool Registry Integration (search_knowledge)", () => {
    it("should have search_knowledge registered in ToolRegistryService with correct permissions", () => {
      const tool = toolRegistry.getTool("search_knowledge");
      expect(tool).toBeDefined();
      expect(tool?.id).toBe("search_knowledge");
      expect(tool?.category).toBe("Knowledge");
      expect(tool?.permissions).toContain("read:knowledge");
    });
  });
});
