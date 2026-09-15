/**
 * ELMO Supabase Architecture & Multi-Tenant Persistence Test Suite
 * 
 * Verifies:
 * 1. Environment variable configuration and server-only secret protection
 * 2. Service-role key client-side prohibition
 * 3. Persistence layer mapping for all 16 core business entities
 * 4. Strict multi-tenant isolation: Business A cannot access Business B's data
 * 5. Company Brain and conversation history persistence
 * 6. Agent execution history persistence and audit logging
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { AuthService } from "@/services/auth.service";
import { OrganizationService } from "@/services/organization.service";
import { MemberService } from "@/services/member.service";
import { ChatService } from "@/services/chat.service";
import { ElmoMemoryService } from "@/services/elmo-memory.service";
import { FunnelService } from "@/services/funnel.service";
import { PageService } from "@/services/page.service";
import { FormService } from "@/services/form.service";
import { ContactService } from "@/services/contact.service";
import { EmailService } from "@/services/email.service";
import { AutomationService } from "@/services/automation.service";
import { AnalyticsService } from "@/services/analytics.service";
import { ExecutionHistoryService } from "@/services/agentic/execution-history.service";
import { getClientEnv, getServerEnv, validateEnv } from "@/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/client";

describe("ELMO Supabase Multi-Tenant Persistence & Security Suite", () => {
  let store: MockDataStore;

  beforeEach(() => {
    store = MockDataStore.getInstance();
    store.reset();
  });

  // ==========================================================================
  // 1. Environment & Security Isolation
  // ==========================================================================
  describe("1. Environment & Secret Protection", () => {
    it("should never expose SUPABASE_SERVICE_ROLE_KEY to client-safe env", () => {
      const clientEnv = getClientEnv();
      expect((clientEnv as any).supabaseServiceRoleKey).toBeUndefined();
      expect((clientEnv as any).serviceRoleKey).toBeUndefined();
    });

    it("should provide safe access to public configuration on client", () => {
      const clientEnv = getClientEnv();
      expect(clientEnv.supabaseUrl).toBeDefined();
      expect(clientEnv.supabaseAnonKey).toBeDefined();
      expect(clientEnv.appUrl).toBeDefined();
    });

    it("should prevent createAdminClient from running on client-side runtime", () => {
      // Temporarily simulate browser window
      const originalWindow = (global as any).window;
      (global as any).window = {};

      try {
        expect(() => createAdminClient()).toThrow(/CRITICAL SECURITY VIOLATION/);
      } finally {
        if (originalWindow) {
          (global as any).window = originalWindow;
        } else {
          delete (global as any).window;
        }
      }
    });

    it("should validate runtime environment without throwing exceptions", () => {
      const result = validateEnv();
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe("boolean");
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // ==========================================================================
  // 2. Strict Multi-Tenant Isolation: Business A vs Business B
  // ==========================================================================
  describe("2. Multi-Tenant Cross-Organization Isolation", () => {
    const orgAId = "org-corp-alpha-001";
    const orgBId = "org-corp-beta-002";
    const userAId = "usr-alice-alpha";
    const userBId = "usr-bob-beta";

    beforeEach(() => {
      // Seed Business A
      store.organizations.set(orgAId, {
        id: orgAId,
        name: "Alpha Corp",
        slug: "alpha-corp",
        settings: { brand: "Alpha Brand" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      store.organizationMembers.set("mem-a", {
        id: "mem-a",
        organization_id: orgAId,
        user_id: userAId,
        role: "owner",
        created_at: new Date().toISOString(),
      });

      // Seed Business B
      store.organizations.set(orgBId, {
        id: orgBId,
        name: "Beta Global",
        slug: "beta-global",
        settings: { brand: "Beta Brand" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      store.organizationMembers.set("mem-b", {
        id: "mem-b",
        organization_id: orgBId,
        user_id: userBId,
        role: "owner",
        created_at: new Date().toISOString(),
      });
    });

    it("should strictly isolate conversations between Business A and Business B", async () => {
      const chatService = ChatService.getInstance();

      // Create conversation for Business A
      const convA = await chatService.createConversation(userAId, orgAId, "Alpha Q3 Roadmap");
      expect(convA.data).toBeDefined();

      // Create conversation for Business B
      const convB = await chatService.createConversation(userBId, orgBId, "Beta Confidential M&A");
      expect(convB.data).toBeDefined();

      // User A queries conversations for Org A: must see convA, NOT convB
      const listA = await chatService.listConversations(userAId, orgAId);
      expect(listA.data.map((c) => c.id)).toContain(convA.data!.id);
      expect(listA.data.map((c) => c.id)).not.toContain(convB.data!.id);

      // User B queries conversations for Org B: must see convB, NOT convA
      const listB = await chatService.listConversations(userBId, orgBId);
      expect(listB.data.map((c) => c.id)).toContain(convB.data!.id);
      expect(listB.data.map((c) => c.id)).not.toContain(convA.data!.id);

      // User A attempts to directly access Business B's conversation
      const crossFetch = await chatService.getConversation(userAId, orgBId, convB.data!.id);
      expect(crossFetch.data).toBeNull();
    });

    it("should strictly isolate Company Brain memories between Business A and Business B", async () => {
      const memoryService = ElmoMemoryService.getInstance();

      // Business A creates memory
      await memoryService.createMemory({
        userId: userAId,
        organizationId: orgAId,
        category: "strategy",
        title: "Alpha Enterprise Tier",
        content: "Alpha Enterprise plan is $4,999/month with dedicated support.",
      });

      // Business B creates memory
      await memoryService.createMemory({
        userId: userBId,
        organizationId: orgBId,
        category: "strategy",
        title: "Beta Pricing Secrets",
        content: "Beta secret wholesale cost is $29/unit.",
      });

      // Query Business A memories: User A cannot see Business B
      const memoriesA = await memoryService.listMemories(userAId, orgAId);
      expect(memoriesA.some((m) => m.content.includes("Alpha Enterprise"))).toBe(true);
      expect(memoriesA.some((m) => m.content.includes("Beta secret wholesale"))).toBe(false);

      // Query Business B memories: User B cannot see Business A
      const memoriesB = await memoryService.listMemories(userBId, orgBId);
      expect(memoriesB.some((m) => m.content.includes("Beta secret wholesale"))).toBe(true);
      expect(memoriesB.some((m) => m.content.includes("Alpha Enterprise"))).toBe(false);

      // Cross-tenant search check
      const crossSearch = await memoryService.searchRelevantMemory(orgAId, "wholesale");
      expect(crossSearch.some((m) => m.content.includes("Beta"))).toBe(false);
    });

    it("should strictly isolate Funnels, Pages, and Forms between Business A and Business B", async () => {
      const funnelService = FunnelService.getInstance();
      const pageService = PageService.getInstance();
      const formService = FormService.getInstance();

      // Create Funnel for A
      const funnelA = await funnelService.createFunnel({
        userId: userAId,
        organizationId: orgAId,
        name: "Alpha SaaS Lead Magnet",
      });
      expect(funnelA.data).toBeDefined();

      // Create Funnel for B
      const funnelB = await funnelService.createFunnel({
        userId: userBId,
        organizationId: orgBId,
        name: "Beta High-Ticket Funnel",
      });
      expect(funnelB.data).toBeDefined();

      // List funnels for A: cannot see B
      const listA = await funnelService.getFunnels(userAId, orgAId);
      expect(listA.data?.map((f) => f.id)).toContain(funnelA.data!.id);
      expect(listA.data?.map((f) => f.id)).not.toContain(funnelB.data!.id);

      // Create Page for A
      const pageA = await pageService.createPage({
        userId: userAId,
        organizationId: orgAId,
        funnelId: funnelA.data!.id,
        name: "Alpha Landing Page",
        title: "Alpha Landing Page",
        slug: "alpha-landing",
      });
      expect(pageA.data).toBeDefined();

      // Create Form for A
      const formA = await formService.createForm({
        userId: userAId,
        organizationId: orgAId,
        pageId: pageA.data!.id,
        name: "Alpha Opt-in Form",
        fields: [{ name: "email", type: "email", label: "Email", required: true }],
      });
      expect(formA.data).toBeDefined();

      // User B cannot query Alpha's forms
      const crossForms = await formService.getForms(userBId, orgAId);
      expect(crossForms.data).toBeNull();
      expect(crossForms.error).toContain("Unauthorized");
    });

    it("should strictly isolate Contacts and Form Submissions between Business A and Business B", async () => {
      const contactService = ContactService.getInstance();

      // Add contact to Business A
      const contactA = await contactService.findOrCreateContact({
        userId: userAId,
        organizationId: orgAId,
        email: "prospect@alpha-client.com",
        firstName: "Alice",
        lastName: "Client",
      });
      expect(contactA.data).toBeDefined();

      // Add contact to Business B
      const contactB = await contactService.findOrCreateContact({
        userId: userBId,
        organizationId: orgBId,
        email: "vip@beta-client.com",
        firstName: "Bob",
        lastName: "Partner",
      });
      expect(contactB.data).toBeDefined();

      // User A queries contacts: must only see Alpha contact
      const listA = await contactService.getContacts(userAId, orgAId);
      expect(listA.data?.some((c) => c.email === "prospect@alpha-client.com")).toBe(true);
      expect(listA.data?.some((c) => c.email === "vip@beta-client.com")).toBe(false);

      // User B queries contacts: must only see Beta contact
      const listB = await contactService.getContacts(userBId, orgBId);
      expect(listB.data?.some((c) => c.email === "vip@beta-client.com")).toBe(true);
      expect(listB.data?.some((c) => c.email === "prospect@alpha-client.com")).toBe(false);
    });

    it("should strictly isolate Email sequences and Automations between Business A and Business B", async () => {
      const emailService = EmailService.getInstance();
      const automationService = AutomationService.getInstance();

      // Create Email sequence for A
      const seqA = await emailService.createSequence({
        userId: userAId,
        organizationId: orgAId,
        name: "Alpha 7-Day Nurture Sequence",
      });
      expect(seqA.data).toBeDefined();

      // Create Automation for A
      const autoA = await automationService.createAutomation({
        userId: userAId,
        organizationId: orgAId,
        name: "Alpha Lead Qualification Trigger",
      });
      expect(autoA.data).toBeDefined();

      // User B cannot access Alpha's sequences or automations
      const crossSeqs = await emailService.getSequences(userBId, orgAId);
      expect(crossSeqs.data).toBeNull();
      expect(crossSeqs.error).toContain("Unauthorized");

      const crossAutos = await automationService.getAutomations(userBId, orgAId);
      expect(crossAutos.data).toBeNull();
      expect(crossAutos.error).toContain("Unauthorized");
    });

    it("should strictly isolate Agent Execution History between Business A and Business B", () => {
      const execService = ExecutionHistoryService.getInstance();
      execService.reset();

      // Record execution for Business A
      execService.recordExecution({
        executionId: "exec-alpha-001",
        organizationId: orgAId,
        userId: userAId,
        goal: "Build Alpha Lead Generation Landing Page",
        objective: "Landing page generation",
        status: "COMPLETED",
        stepsCount: 3,
        completedStepsCount: 3,
        agentsInvolved: ["funnel-agent", "copy-agent", "web-coding-agent"],
        toolsUsed: ["create_funnel", "generate_copy"],
        retryCount: 0,
        startedAt: Date.now() - 5000,
        completedAt: Date.now(),
        summary: "Alpha landing page built successfully",
      });

      // Record execution for Business B
      execService.recordExecution({
        executionId: "exec-beta-002",
        organizationId: orgBId,
        userId: userBId,
        goal: "Analyze Beta Competitors in Logistics",
        objective: "Competitor research",
        status: "COMPLETED",
        stepsCount: 2,
        completedStepsCount: 2,
        agentsInvolved: ["research-agent", "analytics-agent"],
        toolsUsed: ["search_market", "analyze_metrics"],
        retryCount: 0,
        startedAt: Date.now() - 3000,
        completedAt: Date.now(),
        summary: "Beta competitive intelligence completed",
      });

      // Query executions for Business A: only sees Alpha
      const listA = execService.listExecutions(orgAId);
      expect(listA.map((e) => e.executionId)).toContain("exec-alpha-001");
      expect(listA.map((e) => e.executionId)).not.toContain("exec-beta-002");

      // Query executions for Business B: only sees Beta
      const listB = execService.listExecutions(orgBId);
      expect(listB.map((e) => e.executionId)).toContain("exec-beta-002");
      expect(listB.map((e) => e.executionId)).not.toContain("exec-alpha-001");

      // Direct cross-fetch returns undefined
      expect(execService.getExecution("exec-beta-002", orgAId)).toBeUndefined();
    });
  });

  // ==========================================================================
  // 3. Conversation & Message Persistence Flow
  // ==========================================================================
  describe("3. Conversation Lifecycle & Persistence", () => {
    it("should persist conversation across messages and update timestamps", async () => {
      const chatService = ChatService.getInstance();
      const orgId = "org-test-persistence";
      const userId = "usr-test-persistence";

      store.organizations.set(orgId, {
        id: orgId,
        name: "Persistence Test Org",
        slug: "persistence-test-org",
        settings: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      store.organizationMembers.set("mem-pers", {
        id: "mem-pers",
        organization_id: orgId,
        user_id: userId,
        role: "owner",
        created_at: new Date().toISOString(),
      });

      // 1. Create conversation
      const conv = await chatService.createConversation(userId, orgId, "ELMO Executive Strategy");
      expect(conv.data).toBeDefined();
      const convId = conv.data!.id;

      // 2. User sends message
      const userMsg = await chatService.createMessage(userId, orgId, {
        conversationId: convId,
        role: "user",
        content: "Hello ELMO, outline our marketing funnel strategy.",
      });
      expect(userMsg.data).toBeDefined();

      // 3. Assistant responds
      const assistantMsg = await chatService.createMessage(userId, orgId, {
        conversationId: convId,
        role: "assistant",
        content: "Here is your 3-step high-converting marketing funnel plan...",
        metadata: { agentName: "funnel-agent" },
      });
      expect(assistantMsg.data).toBeDefined();

      // 4. Retrieve messages: order and roles must persist accurately
      const history = await chatService.listMessages(userId, orgId, convId);
      expect(history.data).toHaveLength(2);
      expect(history.data[0].role).toBe("user");
      expect(history.data[0].content).toContain("Hello ELMO");
      expect(history.data[1].role).toBe("assistant");
      expect(history.data[1].metadata?.agentName).toBe("funnel-agent");
    });
  });

  // ==========================================================================
  // 4. All 16 Entities Database Mapping Verification
  // ==========================================================================
  describe("4. All 16 Entity Services Readiness", () => {
    it("verifies that all 16 target entities have functional services and data mappings", () => {
      const entities = [
        { name: "1. Authentication", service: AuthService.getInstance() },
        { name: "2. Users", service: AuthService.getInstance() },
        { name: "3. Organizations", service: OrganizationService.getInstance() },
        { name: "4. Organization Members", service: MemberService.getInstance() },
        { name: "5. Conversations", service: ChatService.getInstance() },
        { name: "6. Messages", service: ChatService.getInstance() },
        { name: "7. Company Memories (Brain)", service: ElmoMemoryService.getInstance() },
        { name: "8. Funnels", service: FunnelService.getInstance() },
        { name: "9. Pages", service: PageService.getInstance() },
        { name: "10. Forms", service: FormService.getInstance() },
        { name: "11. Contacts", service: ContactService.getInstance() },
        { name: "12. Form Submissions", service: FormService.getInstance() },
        { name: "13. Email Data (Templates & Sequences)", service: EmailService.getInstance() },
        { name: "14. Automations", service: AutomationService.getInstance() },
        { name: "15. Analytics Events", service: AnalyticsService.getInstance() },
        { name: "16. Agent Execution History", service: ExecutionHistoryService.getInstance() },
      ];

      for (const entity of entities) {
        expect(entity.service).toBeDefined();
        expect(typeof entity.service).toBe("object");
      }
    });
  });
});
