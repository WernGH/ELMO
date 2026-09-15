import { describe, it, expect, beforeEach } from "vitest";
import { ChatService } from "@/services/chat.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("Security & Multi-Tenant Isolation - Conversations & Messages", () => {
  let chatService: ChatService;
  let mockStore: MockDataStore;

  const orgA = "tenant-org-alpha";
  const userA = "tenant-user-alpha";

  const orgB = "tenant-org-beta";
  const userB = "tenant-user-beta";

  beforeEach(() => {
    mockStore = MockDataStore.getInstance();
    mockStore.reset();
    chatService = ChatService.getInstance();

    // Setup Org A and User A
    mockStore.organizations.set(orgA, {
      id: orgA,
      name: "Alpha Corporation",
      slug: "alpha-corp",
      settings: { secret: "alpha-confidential" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockStore.organizationMembers.set("mem-a", {
      id: "mem-a",
      organization_id: orgA,
      user_id: userA,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    // Setup Org B and User B
    mockStore.organizations.set(orgB, {
      id: orgB,
      name: "Beta Corporation",
      slug: "beta-corp",
      settings: { secret: "beta-confidential" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mockStore.organizationMembers.set("mem-b", {
      id: "mem-b",
      organization_id: orgB,
      user_id: userB,
      role: "owner",
      created_at: new Date().toISOString(),
    });
  });

  it("should strictly prevent User A from listing conversations in Org B", async () => {
    // Org B creates a confidential conversation
    const convBRes = await chatService.createConversation(
      userB,
      orgB,
      "Beta Confidential M&A Strategy"
    );
    expect(convBRes.data).toBeDefined();

    // User A attempts to list conversations in Org B
    const userAInOrgB = await chatService.listConversations(userA, orgB);
    expect(userAInOrgB.data.length).toBe(0);

    // User B CAN see their own conversation
    const userBInOrgB = await chatService.listConversations(userB, orgB);
    expect(userBInOrgB.data.some((c) => c.id === convBRes.data?.id)).toBe(true);
  });

  it("should strictly prevent User A from fetching messages of a conversation in Org B", async () => {
    const convB = await chatService.createConversation(userB, orgB, "Beta Internal Discussion");
    const convBId = convB.data!.id;

    await chatService.createMessage(userB, orgB, {
      conversationId: convBId,
      role: "assistant",
      content: "Classified strategic blueprint for Beta Corp.",
    });

    // User A attempts to query messages of Org B
    const leakedMessages = await chatService.listMessages(userA, orgB, convBId);
    expect(leakedMessages.data.length).toBe(0);

    // User B CAN see messages
    const legitMessages = await chatService.listMessages(userB, orgB, convBId);
    expect(legitMessages.data.length).toBe(1);
    expect(legitMessages.data[0].content).toContain("Classified strategic blueprint");
  });

  it("should reject conversation deletion attempts from unauthorized users", async () => {
    const convB = await chatService.createConversation(userB, orgB, "Target For Unauthorized Deletion");
    const convBId = convB.data!.id;

    // User A attempts to delete User B's conversation
    const deleteAttempt = await chatService.deleteConversation(userA, orgB, convBId);
    expect(deleteAttempt.success).toBe(false);

    // Verify conversation still exists
    const checkRes = await chatService.getConversation(userB, orgB, convBId);
    expect(checkRes.data).toBeDefined();
    expect(checkRes.data?.id).toBe(convBId);
  });
});
