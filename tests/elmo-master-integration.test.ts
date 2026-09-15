/**
 * ELMO Master Migration & Integration Test Suite
 *
 * Verifies end-to-end functionality of:
 * 1. Company Memory Engine (ICompanyMemoryEngine / ElmoMemoryService)
 * 2. Unified Context Engine (ElmoContextService with memory injection)
 * 3. AI Funnel Agent (ElmoFunnelAgentService with 5 turn types & safety gates)
 * 4. ELMO Tool Service (Controlled business tools with tenant isolation)
 * 5. Unified Executive Intelligence (Voice & Text shared brain)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { ElmoContextService } from "@/services/elmo-context.service";
import { ElmoToolService } from "@/services/elmo-tool.service";
import { ElmoFunnelAgentService } from "@/services/elmo-funnel-agent.service";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";
import { FunnelService } from "@/services/funnel.service";

describe("ELMO Master Migration & Integration Suite", () => {
  const store = MockDataStore.getInstance();
  const memoryService = ElmoMemoryService.getInstance();
  const contextService = ElmoContextService.getInstance();
  const toolService = ElmoToolService.getInstance();
  const funnelAgent = ElmoFunnelAgentService.getInstance();
  const intelligenceService = ELMOIntelligenceService.getInstance();

  const orgA = "org-corp-alpha-1111";
  const orgB = "org-corp-beta-2222";
  const userA = "user-founder-alpha-001";
  const userB = "user-founder-beta-002";

  beforeEach(() => {
    store.reset();
    ElmoFunnelAgentService.resetInstance();
    ELMOIntelligenceService.resetInstance();

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

  // =========================================================================
  // 1. Company Memory Engine (ICompanyMemoryEngine)
  // =========================================================================
  describe("1. Company Memory Engine (ICompanyMemoryEngine)", () => {
    it("should persist business memory, funnel decisions, and goals", async () => {
      // 1. Business Memory
      const memRes = await memoryService.saveBusinessMemory({
        userId: userA,
        organizationId: orgA,
        content: "Alpha Corp provides premium enterprise SaaS solutions.",
        metadata: { targetMarket: "B2B", pricing: "high-ticket" },
        importanceScore: 0.9,
      });
      expect(memRes.error).toBeNull();
      expect(memRes.data?.id).toBeDefined();

      // 2. Funnel Decision
      const decRes = await memoryService.saveFunnelDecision({
        userId: userA,
        organizationId: orgA,
        funnelId: "funnel-alpha-1",
        decision: "Adopt 2-step opt-in with video sales letter instead of direct checkout.",
        rationale: "Improves conversion by 34% for cold traffic.",
        importanceScore: 0.9,
      });
      expect(decRes.error).toBeNull();
      expect(decRes.data?.category).toBe("decision");

      // 3. Goal
      const goalRes = await memoryService.saveGoal({
        userId: userA,
        organizationId: orgA,
        objective: "Acquire 500 qualified enterprise leads in Q4",
        targetMetric: "leads",
        targetValue: 500,
        deadline: "2026-12-31",
      });
      expect(goalRes.error).toBeNull();
      expect(goalRes.data?.category).toBe("goal");
    });

    it("should search relevant memories using relevance scoring", async () => {
      await memoryService.saveBusinessMemory({
        userId: userA,
        organizationId: orgA,
        content: "Authoritative, sophisticated, and encouraging executive tone.",
      });

      await memoryService.saveBusinessMemory({
        userId: userA,
        organizationId: orgA,
        content: "Customers prefer annual billing with a 20% discount.",
      });

      const searchResults = await memoryService.searchRelevantMemory(
        orgA,
        "Authoritative brand tone and voice",
        undefined,
        5
      );

      expect(searchResults.length).toBeGreaterThanOrEqual(1);
      expect(searchResults[0].content).toContain("Authoritative, sophisticated");
    });

    it("should enforce strict multi-tenant isolation in memory engine", async () => {
      await memoryService.saveBusinessMemory({
        userId: userA,
        organizationId: orgA,
        content: "Confidential Alpha Corp Trade Secret: Project X",
      });

      // Query from Org B must NOT return Org A's secrets
      const orgBMemories = await memoryService.getRelevantMemoriesForContext(userB, orgB);
      expect(orgBMemories.find((m) => m.content.includes("Project X"))).toBeUndefined();
    });
  });

  // =========================================================================
  // 2. Context Engine Integration
  // =========================================================================
  describe("2. Context Engine Memory Integration", () => {
    it("should inject company memories into assembled ELMO context and system prompt", async () => {
      await memoryService.saveBusinessMemory({
        userId: userA,
        organizationId: orgA,
        content: "Always address clients with executive sophistication.",
      });

      const assembled = await contextService.assembleContext({
        userId: userA,
        organizationId: orgA,
        currentTask: "Design an onboarding funnel",
      });

      expect(assembled.memories).toBeDefined();
      expect(assembled.memories!.length).toBeGreaterThan(0);
      expect(assembled.memories![0].content).toContain("executive sophistication");

      expect(assembled.systemInstruction).toContain("Relevant Organizational & Funnel Memory");
      expect(assembled.systemInstruction).toContain("executive sophistication");
    });
  });

  // =========================================================================
  // 3. AI Funnel Agent Turn Types & Safety Gates
  // =========================================================================
  describe("3. AI Funnel Agent Turn Types & Safety Gates", () => {
    it("Turn 1: INFORMATION — answers factual question without executing tools", async () => {
      const result = await funnelAgent.processDirective({
        userId: userA,
        organizationId: orgA,
        message: "What is a webinar funnel and how does it work?",
      });

      expect(result.turnMode).toBe("INFORMATION");
      expect(result.toolsExecuted).toHaveLength(0);
      expect(result.response).toContain("Webinar Funnel");
    });

    it("Turn 2: RECOMMENDATION — provides strategic advice with rationale", async () => {
      const result = await funnelAgent.processDirective({
        userId: userA,
        organizationId: orgA,
        message: "Which funnel should I use to sell a $2,000 high-ticket consulting program?",
      });

      expect(result.turnMode).toBe("RECOMMENDATION");
      expect(result.toolsExecuted).toHaveLength(0);
      expect(result.response).toContain("Strategic Blueprint");
    });

    it("Turn 3: PLANNING — creates structured blueprint without executing tools", async () => {
      const result = await funnelAgent.processDirective({
        userId: userA,
        organizationId: orgA,
        message: "Plan a webinar funnel for our high-ticket software demo",
      });

      expect(result.turnMode).toBe("PLANNING");
      expect(result.toolsExecuted).toHaveLength(0);
      expect(result.response).toContain("Strategic Funnel Plan");
    });

    it("Turn 4: EXECUTION — creates funnel, pages, and records decision in memory", async () => {
      const result = await funnelAgent.processDirective({
        userId: userA,
        organizationId: orgA,
        message: "Create a lead generation funnel for executive coaching",
      });

      expect(result.turnMode).toBe("EXECUTION");
      expect(result.visualState).toBe("SUCCESS");
      expect(result.toolsExecuted.length).toBeGreaterThan(0);

      // Verify the funnel was created in the store
      const funnels = Array.from(store.funnels.values()).filter((f) => f.organization_id === orgA);
      expect(funnels.length).toBe(1);
      expect(funnels[0].name).toContain("Coaching System");

      // Verify memory of the funnel creation was saved
      const memories = Array.from(store.memories.values()).filter(
        (m) => m.organization_id === orgA && m.category === "decision"
      );
      expect(memories.length).toBeGreaterThan(0);
    });

    it("Turn 5: CONFIRMATION REQUIRED & EXECUTED — stages destructive action and waits for user confirmation", async () => {
      // First, create a funnel to delete
      const fRes = await FunnelService.getInstance().createFunnel({
        userId: userA,
        organizationId: orgA,
        name: "Temporary Campaign",
        funnelType: "Lead Generation",
      });
      const funnelId = fRes.data!.id;

      // 1. User asks to delete funnel -> Safety gate catches it
      const deleteAttempt = await funnelAgent.processDirective({
        userId: userA,
        organizationId: orgA,
        message: `Delete funnel ${funnelId}`,
      });

      expect(deleteAttempt.turnMode).toBe("CONFIRMATION_REQUIRED");
      expect(deleteAttempt.toolsExecuted).toHaveLength(0);
      expect(deleteAttempt.pendingConfirmation).toBeDefined();
      expect(deleteAttempt.response).toContain("Caution");

      // Verify the funnel is NOT yet deleted
      expect(store.funnels.has(funnelId)).toBe(true);

      // 2. User confirms -> Action executes
      const confirmResult = await funnelAgent.processDirective({
        userId: userA,
        organizationId: orgA,
        message: "Yes, proceed and delete it",
      });

      expect(confirmResult.turnMode).toBe("CONFIRMATION_EXECUTED");
      expect(confirmResult.toolsExecuted).toHaveLength(1);
      expect(confirmResult.toolsExecuted[0].tool).toBe("delete_funnel");
      expect(confirmResult.toolsExecuted[0].success).toBe(true);

      // Verify the funnel is now permanently deleted
      expect(store.funnels.has(funnelId)).toBe(false);
    });
  });

  // =========================================================================
  // 4. ELMO Tool Service Multi-Tenant Execution
  // =========================================================================
  describe("4. ELMO Tool Service Multi-Tenant Execution", () => {
    it("should execute tools strictly scoped to the tenant organization", async () => {
      // Create contact in Org A
      const contactRes = await toolService.executeTool(
        "create_contact",
        {
          email: "lead@acme.com",
          firstName: "John",
          lastName: "Doe",
          tags: ["vip", "inbound"],
        },
        { userId: userA, organizationId: orgA }
      );
      expect(contactRes.success).toBe(true);
      expect((contactRes.data as any).email).toBe("lead@acme.com");

      // Verify contact exists in Org A
      const contactsA = Array.from(store.contacts.values()).filter((c) => c.organization_id === orgA);
      expect(contactsA).toHaveLength(1);

      // Org B should have NO contacts
      const contactsB = Array.from(store.contacts.values()).filter((c) => c.organization_id === orgB);
      expect(contactsB).toHaveLength(0);
    });

    it("should generate marketing copy via generate_copy tool", async () => {
      const copyRes = await toolService.executeTool(
        "generate_copy",
        {
          copyType: "headline",
          topic: "AI Funnel Automation for High-Growth SaaS",
          tone: "authoritative",
        },
        { userId: userA, organizationId: orgA }
      );

      expect(copyRes.success).toBe(true);
      expect((copyRes.data as any).headlines).toBeDefined();
      expect((copyRes.data as any).headlines.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 5. Unified Executive Intelligence (Voice & Text Cross-Modal Continuity)
  // =========================================================================
  describe("5. Unified Executive Intelligence (Voice & Text Shared Brain)", () => {
    it("should process funnel directives from both text and voice using the same brain", async () => {
      // 1. Text Directive: Create funnel
      const textRes = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "Create a webinar funnel for Enterprise AI launch",
        inputMode: "text",
      });

      expect(textRes.turnMode).toBe("EXECUTION");
      expect(textRes.visualState).toBe("SUCCESS");
      const conversationId = textRes.conversationId;

      // 2. Voice Directive in the same conversation: Ask recommendation or stats
      const voiceRes = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        conversationId,
        message: "Which funnel should I use to scale this next quarter?",
        inputMode: "voice",
      });

      expect(voiceRes.conversationId).toBe(conversationId);
      expect(voiceRes.turnMode).toBe("RECOMMENDATION");
      expect(voiceRes.inputMode).toBe("voice");
    });

    it("should maintain casual conversation without triggering funnel tools", async () => {
      const casualRes = await intelligenceService.processMessage({
        userId: userA,
        organizationId: orgA,
        message: "Apa khabar hari ni?",
        inputMode: "text",
      });

      // Should be handled as regular conversation/greeting, not executing funnel tools
      expect(casualRes.toolsExecuted).toBeUndefined();
      expect(casualRes.detectedLanguageCode).toBe("ms");
      expect(casualRes.responseLanguage).toBe("ms");
    });
  });
});
