/**
 * ELMO Phase 2 — Advanced Long-Term Memory + Company Brain Test Suite
 *
 * Validates:
 * 1. Memory Architecture & Lifecycle (Active, Superseded, Archived, Expired, Deleted)
 * 2. Importance (1-5) and Calibrated Confidence (Low, Medium, High, Confirmed)
 * 3. Intelligent Conflict Resolution & Traceable Supersession (superseded_by)
 * 4. Temporal Validity (valid_from, valid_until expiration gating)
 * 5. Strict Multi-Tenant Security & Organization Isolation (No cross-org leaks)
 * 6. Explicit Memory Commands (store, forget, update, query)
 * 7. Automatic Semantic Memory Extraction (facts vs casual chat)
 * 8. Multilingual Memory Continuity (English <-> Malay cross-lingual retrieval)
 * 9. Unified Voice & Text Shared Memory Foundation
 * 10. Complete Section 39 Acceptance Test Flow
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { ElmoContextService } from "@/services/elmo-context.service";
import { ElmoIntentService } from "@/services/elmo-intent.service";
import { ElmoFunnelAgentService } from "@/services/elmo-funnel-agent.service";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("ELMO Phase 2 — Advanced Long-Term Memory & Company Brain", () => {
  let store: MockDataStore;
  let memoryService: ElmoMemoryService;
  let contextService: ElmoContextService;
  let intentService: ElmoIntentService;
  let funnelAgent: ElmoFunnelAgentService;
  let intelligenceService: ELMOIntelligenceService;

  const orgA = "11111111-1111-1111-1111-111111111111";
  const orgB = "22222222-2222-2222-2222-222222222222";
  const userA = "00000000-0000-0000-0000-000000000001";
  const userB = "00000000-0000-0000-0000-000000000002";

  beforeEach(() => {
    store = MockDataStore.getInstance();
    store.reset();
    ElmoMemoryService.resetInstance();
    ElmoFunnelAgentService.resetInstance();
    ELMOIntelligenceService.resetInstance();

    memoryService = ElmoMemoryService.getInstance();
    contextService = ElmoContextService.getInstance();
    intentService = ElmoIntentService.getInstance();
    funnelAgent = ElmoFunnelAgentService.getInstance();
    intelligenceService = ELMOIntelligenceService.getInstance();

    // Register test orgs and users
    store.users.set(userA, { id: userA, email: "alpha@corp.com", passwordHash: "pass" });
    store.organizations.set(orgA, {
      id: orgA,
      name: "Alpha Corp",
      slug: "alpha-corp",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    store.organizationMembers.set(`${orgA}:${userA}`, {
      id: `mem-${userA}`,
      organization_id: orgA,
      user_id: userA,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    store.users.set(userB, { id: userB, email: "beta@corp.com", passwordHash: "pass" });
    store.organizations.set(orgB, {
      id: orgB,
      name: "Beta Corp",
      slug: "beta-corp",
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    store.organizationMembers.set(`${orgB}:${userB}`, {
      id: `mem-${userB}`,
      organization_id: orgB,
      user_id: userB,
      role: "owner",
      created_at: new Date().toISOString(),
    });
  });

  // ==========================================================================
  // 1. Memory Lifecycle & Statuses
  // ==========================================================================
  describe("1. Memory Lifecycle & Statuses", () => {
    it("should manage complete memory lifecycle: active -> superseded -> archived -> deleted", async () => {
      // Create initial active memory
      const created = await memoryService.createMemory({
        userId: userA,
        organizationId: orgA,
        title: "Target Market",
        content: "Targeting early-stage boot-strapped startups.",
        category: "business",
        importance: 4,
        confidenceLevel: "high",
        status: "active",
      });

      expect(created.error).toBeNull();
      expect(created.data?.status).toBe("active");
      expect(created.data?.importance_score).toBe(4);
      expect(created.data?.confidence_level).toBe("high");

      const oldId = created.data!.id;

      // Supersede with updated strategy
      const superRes = await memoryService.supersedeMemory({
        userId: userA,
        organizationId: orgA,
        oldMemoryId: oldId,
        newMemory: {
          title: "Target Market",
          content: "Now targeting mid-market scaleups with 20+ employees.",
          category: "business",
          importance: 5,
          confidenceLevel: "confirmed",
        },
      });

      expect(superRes.error).toBeNull();
      expect(superRes.data?.oldMemory.status).toBe("superseded");
      expect(superRes.data?.oldMemory.superseded_by).toBe(superRes.data?.newMemory.id);
      expect(superRes.data?.newMemory.status).toBe("active");

      // Verify active query does not return superseded memory
      const activeMemories = await memoryService.getRelevantMemoriesForContext(userA, orgA, "targeting", 5);
      expect(activeMemories.some((m) => m.id === oldId)).toBe(false);
      expect(activeMemories.some((m) => m.id === superRes.data?.newMemory.id)).toBe(true);

      // Verify history traces back to original memory
      const historyRes = await memoryService.getMemoryHistory(userA, orgA, superRes.data!.newMemory.id);
      expect(historyRes.data?.length).toBe(2);

      // Archive memory
      const archiveRes = await memoryService.archiveMemory(userA, orgA, superRes.data!.newMemory.id);
      expect(archiveRes.data?.status).toBe("archived");

      // Delete memory
      const delRes = await memoryService.deleteMemory(userA, orgA, superRes.data!.newMemory.id);
      expect(delRes.data).toBe(true);
      const fetchAfterDel = await memoryService.getMemoryById(userA, orgA, superRes.data!.newMemory.id);
      expect(fetchAfterDel.data).toBeNull();
    });
  });

  // ==========================================================================
  // 2. Importance & Calibrated Confidence
  // ==========================================================================
  describe("2. Importance & Calibrated Confidence", () => {
    it("should calibrate confidence scores correctly and rank by multi-factor score", async () => {
      // 1. Low confidence exploratory note
      await memoryService.createMemory({
        userId: userA,
        organizationId: orgA,
        content: "User mentioned they might experiment with TikTok ads next quarter.",
        category: "strategy",
        importance: 2,
        confidenceLevel: "low",
      });

      // 2. Critical confirmed core offer
      const confirmedOffer = await memoryService.createMemory({
        userId: userA,
        organizationId: orgA,
        content: "Core Offer: Complete Automated Funnel Operating System at $2,500 setup.",
        category: "business",
        importance: 5,
        confidenceLevel: "confirmed",
      });

      // 3. Useful context
      await memoryService.createMemory({
        userId: userA,
        organizationId: orgA,
        content: "Prefers concise email follow-ups over lengthy newsletters.",
        category: "preference",
        importance: 3,
        confidenceLevel: "high",
      });

      const retrieved = await memoryService.getRelevantMemoriesForContext(userA, orgA, undefined, 5);

      // Highest importance & confirmed memory should rank at the top
      expect(retrieved[0].id).toBe(confirmedOffer.data?.id);
      expect(Number(retrieved[0].importance_score)).toBe(5);
      expect(retrieved[0].confidence_level).toBe("confirmed");
    });
  });

  // ==========================================================================
  // 3. Temporal Validity & Expiration
  // ==========================================================================
  describe("3. Temporal Validity & Expiration", () => {
    it("should exclude expired time-bound memories from active reasoning context", async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Expired promo
      await memoryService.createMemory({
        userId: userA,
        organizationId: orgA,
        title: "Labor Day Special Promo",
        content: "Use coupon code FLASH50 for 50% off during Labor Day weekend.",
        category: "business",
        validUntil: yesterday,
        importance: 5,
      });

      // Active quarterly goal
      const activeGoal = await memoryService.createMemory({
        userId: userA,
        organizationId: orgA,
        title: "Q4 Target",
        content: "Close 50 enterprise funnel contracts by end of quarter.",
        category: "goal",
        validUntil: nextMonth,
        importance: 4,
      });

      const activeContextMemories = await memoryService.getRelevantMemoriesForContext(userA, orgA, undefined, 10);

      // Expired promo must not appear in active context
      expect(activeContextMemories.some((m) => m.title === "Labor Day Special Promo")).toBe(false);
      // Active goal must appear
      expect(activeContextMemories.some((m) => m.id === activeGoal.data?.id)).toBe(true);
    });
  });

  // ==========================================================================
  // 4. Strict Multi-Tenant Isolation
  // ==========================================================================
  describe("4. Multi-Tenant Security & Isolation", () => {
    it("should strictly prevent Organization B from accessing Organization A memories", async () => {
      // Store confidential secret in Org A
      await memoryService.saveBusinessMemory({
        userId: userA,
        organizationId: orgA,
        title: "Proprietary Algorithm",
        content: "Org A proprietary secret: High-yield lead acquisition funnel.",
      });

      // Org B user attempts to retrieve memories with matching query
      const orgBResults = await memoryService.getRelevantMemoriesForContext(
        userB,
        orgB,
        "proprietary secret high-yield lead acquisition",
        10
      );

      expect(orgBResults.length).toBe(0);

      // Org B user attempts to query Org A's ID directly -> unauthorized
      const directUnauthorized = await memoryService.getRelevantMemoriesForContext(
        userB,
        orgA,
        "proprietary secret",
        10
      );
      expect(directUnauthorized.length).toBe(0);

      // Org A user correctly accesses it
      const orgAResults = await memoryService.getRelevantMemoriesForContext(
        userA,
        orgA,
        "proprietary secret",
        10
      );
      expect(orgAResults.length).toBe(1);
      expect(orgAResults[0].content).toContain("Org A proprietary secret");
    });
  });

  // ==========================================================================
  // 5. Explicit Natural Language Memory Commands
  // ==========================================================================
  describe("5. Explicit Natural Language Memory Commands", () => {
    it("should recognize and execute explicit memory commands (store, forget, update, query)", async () => {
      // 1. Store Command
      const storeRes = await memoryService.handleExplicitMemoryCommand(
        userA,
        orgA,
        "Remember that our main offer is the Executive Funnel Suite priced at $4,997."
      );
      expect(storeRes.action).toBe("stored");
      expect(storeRes.memory?.confidence_level).toBe("confirmed");
      expect(storeRes.explanation).toContain("Executive Funnel Suite");

      // 2. Query Command
      const queryRes = await memoryService.handleExplicitMemoryCommand(
        userA,
        orgA,
        "What do you remember about our main offer?"
      );
      expect(queryRes.action).toBe("queried");
      expect(queryRes.memories?.length).toBeGreaterThan(0);
      expect(queryRes.memories![0].content).toContain("Executive Funnel Suite");

      // 3. Update / Outdated Command
      const updateRes = await memoryService.handleExplicitMemoryCommand(
        userA,
        orgA,
        "That's no longer correct. Use this instead: Our main offer is now the Enterprise All-in-One at $7,500."
      );
      expect(updateRes.action).toBe("updated");
      expect(updateRes.explanation).toContain("superseded the previous memory");

      // Verify active query reflects update
      const active = await memoryService.getRelevantMemoriesForContext(userA, orgA, "main offer", 1);
      expect(active[0].content).toContain("$7,500");

      // 4. Forget Command
      const forgetRes = await memoryService.handleExplicitMemoryCommand(
        userA,
        orgA,
        "Forget what I told you about our main offer."
      );
      expect(forgetRes.action).toBe("forgotten");
      expect(forgetRes.explanation).toContain("archived and will no longer consider active");
    });
  });

  // ==========================================================================
  // 6. Automatic Semantic Extraction & Conflict Resolution
  // ==========================================================================
  describe("6. Automatic Semantic Extraction & Conflict Resolution", () => {
    it("should extract business facts from user message and supersede conflicting audience", async () => {
      // Turn 1: User introduces audience
      const turn1 = await memoryService.extractMemoriesFromConversation(
        userA,
        orgA,
        [],
        "Our target audience is dental clinics looking to fill open calendar slots."
      );
      expect(turn1.memoriesCreated.length).toBe(1);
      expect(turn1.memoriesCreated[0].content).toContain("dental clinics");

      // Turn 2: Casual chat -> should not store anything
      const turn2 = await memoryService.extractMemoriesFromConversation(
        userA,
        orgA,
        [{ role: "user", content: "Hi ELMO, how are you?" }],
        "Hi ELMO, how are you today?"
      );
      expect(turn2.memoriesCreated.length).toBe(0);

      // Turn 3: User shifts audience -> conflict detection should supersede Turn 1
      const turn3 = await memoryService.extractMemoriesFromConversation(
        userA,
        orgA,
        [],
        "Actually, we are changing our audience to multi-location plastic surgery centers."
      );
      expect(turn3.memoriesSuperseded.length).toBe(1);
      expect(turn3.memoriesSuperseded[0].oldMemory.status).toBe("superseded");
      expect(turn3.memoriesSuperseded[0].newMemory.content).toContain("plastic surgery centers");
    });

    it("should extract goals, decisions, preferences, temporary promos, and calibrate uncertainty", async () => {
      // 1. Goal extraction
      const goalTurn = await memoryService.extractMemoriesFromConversation(
        userA,
        orgA,
        [],
        "Our goal this quarter is to generate 500 qualified leads."
      );
      expect(goalTurn.memoriesCreated.length).toBe(1);
      expect(goalTurn.memoriesCreated[0].category).toBe("goal");
      expect(goalTurn.memoriesCreated[0].content).toContain("500 qualified leads");

      // 2. Strategic decision extraction
      const decTurn = await memoryService.extractMemoriesFromConversation(
        userA,
        orgA,
        [],
        "We decided to focus exclusively on inbound content rather than paid ads."
      );
      expect(decTurn.memoriesCreated.length).toBe(1);
      expect(decTurn.memoriesCreated[0].category).toBe("decision");
      expect(decTurn.memoriesCreated[0].content).toContain("inbound content");

      // 3. Operational / negative preference extraction
      const prefTurn = await memoryService.extractMemoriesFromConversation(
        userA,
        orgA,
        [],
        "Don't use aggressive sales language in our marketing."
      );
      expect(prefTurn.memoriesCreated.length).toBe(1);
      expect(prefTurn.memoriesCreated[0].category).toBe("preference");

      // 4. Uncertain / exploratory information extraction with MEDIUM confidence
      const uncTurn = await memoryService.extractMemoriesFromConversation(
        userA,
        orgA,
        [],
        "I think we might launch on October 15 if beta testing goes well."
      );
      expect(uncTurn.memoriesCreated.length).toBe(1);
      expect(uncTurn.memoriesCreated[0].confidence_level).toBe("medium");
      expect(Number(uncTurn.memoriesCreated[0].confidence)).toBeLessThan(0.8);

      // 5. Temporary time-bound offer extraction with validUntil
      const tempTurn = await memoryService.extractMemoriesFromConversation(
        userA,
        orgA,
        [],
        "This promotion ends on Friday at midnight."
      );
      expect(tempTurn.memoriesCreated.length).toBe(1);
      expect(tempTurn.memoriesCreated[0].valid_until).toBeDefined();
    });
  });

  // ==========================================================================
  // 7. Multilingual Memory Continuity (Cross-Language Retrieval)
  // ==========================================================================
  describe("7. Multilingual Memory Continuity", () => {
    it("should store memory in English and retrieve accurately with a Malay query", async () => {
      // Store in English
      await memoryService.createMemory({
        userId: userA,
        organizationId: orgA,
        title: "Target Audience",
        content: "Target audience is established business owners needing automated lead follow-up.",
        category: "business",
        importance: 5,
        confidenceLevel: "confirmed",
      });

      // Query in Malay: "Siapakah sasaran pelanggan kita?"
      const retrieved = await memoryService.getRelevantMemoriesForContext(
        userA,
        orgA,
        "Siapakah sasaran pelanggan kita?",
        3
      );

      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0].content).toContain("established business owners");
    });
  });

  // ==========================================================================
  // 8. Voice & Text Shared Memory Integration
  // ==========================================================================
  describe("8. Voice & Text Shared Memory Integration", () => {
    it("should allow a voice turn to store memory and a text turn to retrieve and reason with it", async () => {
      // Voice turn: User says "Remember that we don't want aggressive sales messaging"
      const voiceTurn = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "Remember that we don't want aggressive sales messaging in our marketing.",
        inputMode: "voice",
      });

      expect(voiceTurn.text).toContain("CONFIRMED");

      // Text turn: User asks "What should our landing page focus on?"
      const textTurn = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "What should our landing page focus on?",
        inputMode: "text",
      });

      // The text turn response must incorporate the stored negative constraint
      expect(textTurn.text.toLowerCase()).toContain("aggressive");
    });
  });

  // ==========================================================================
  // 9. Full Section 39 Realistic Acceptance Test Flow
  // ==========================================================================
  describe("9. Section 39 Complete Acceptance Test Flow", () => {
    it("should execute the complete realistic 6-turn conversational lifecycle", async () => {
      // Conversation 1: Introduction of business facts
      const turn1 = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "My company sells a premium service. Our main audience is established businesses. Our current goal is to generate 100 qualified leads.",
        inputMode: "text",
      });
      expect(turn1.text).toBeDefined();

      // Verify memories were recorded
      const memoriesC1 = await memoryService.listMemories(userA, orgA, { status: "active" });
      expect(memoriesC1.some((m) => m.content.toLowerCase().includes("premium service"))).toBe(true);
      expect(memoriesC1.some((m) => m.content.toLowerCase().includes("established businesses"))).toBe(true);

      // Conversation 2: Landing page focus query
      const turn2 = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "What should our landing page focus on?",
        inputMode: "text",
      });
      // ELMO answers with Company Brain context without asking user to repeat
      expect(turn2.text).toContain("established businesses");
      expect(turn2.text).toContain("premium service");

      // Conversation 3: Changing audience
      const turn3 = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "Actually, we're changing our audience to enterprise organizations.",
        inputMode: "text",
      });
      expect(turn3.text).toBeDefined();

      // Verify supersession occurred
      const allMemories = await memoryService.listMemories(userA, orgA, { status: ["active", "superseded"] });
      const superseded = allMemories.find((m) => m.status === "superseded");
      expect(superseded).toBeDefined();
      expect(superseded?.content).toContain("established businesses");

      // Conversation 4: Inquire about historical audience
      const turn4 = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "What was our previous audience?",
        inputMode: "text",
      });
      expect(turn4.text).toContain("established businesses");
      expect(turn4.text).toContain("historical");

      // Conversation 5: Store negative preference
      const turn5 = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "Remember that we don't want aggressive sales messaging.",
        inputMode: "text",
      });
      expect(turn5.text).toContain("CONFIRMED");

      // Conversation 6: Funnel creation inherits company brain
      const turn6 = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "Create a webinar funnel for our launch.",
        inputMode: "text",
      });

      expect(turn6.text).toContain("Webinar System");
      // Verify funnel created with enterprise organizations
      const funnels = Array.from(store.funnels.values()).filter((f) => f.organization_id === orgA);
      expect(funnels.length).toBeGreaterThan(0);
      const latestFunnel = funnels[funnels.length - 1];
      expect(latestFunnel.target_audience).toContain("enterprise organizations");
    });
  });
});
