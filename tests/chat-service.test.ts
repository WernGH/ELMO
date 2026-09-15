import { describe, it, expect, beforeEach } from "vitest";
import { ChatService } from "@/services/chat.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("ChatService - Conversation & Message Persistence", () => {
  let chatService: ChatService;
  let mockStore: MockDataStore;

  const defaultUserId = "00000000-0000-0000-0000-000000000001";
  const defaultOrgId = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    mockStore = MockDataStore.getInstance();
    mockStore.reset();
    chatService = ChatService.getInstance();
  });

  it("should create, list, and fetch conversations", async () => {
    const createRes = await chatService.createConversation(
      defaultUserId,
      defaultOrgId,
      "Q4 Workforce Planning"
    );

    expect(createRes.error).toBeNull();
    expect(createRes.data).toBeDefined();
    expect(createRes.data?.title).toBe("Q4 Workforce Planning");
    expect(createRes.data?.organization_id).toBe(defaultOrgId);

    const convId = createRes.data!.id;

    // List conversations
    const listRes = await chatService.listConversations(defaultUserId, defaultOrgId);
    expect(listRes.error).toBeNull();
    expect(listRes.data.some((c) => c.id === convId)).toBe(true);

    // Get specific conversation
    const getRes = await chatService.getConversation(defaultUserId, defaultOrgId, convId);
    expect(getRes.error).toBeNull();
    expect(getRes.data?.id).toBe(convId);
    expect(getRes.data?.title).toBe("Q4 Workforce Planning");
  });

  it("should persist user and assistant messages in chronological order", async () => {
    const convRes = await chatService.createConversation(
      defaultUserId,
      defaultOrgId,
      "Directives Log"
    );
    const convId = convRes.data!.id;

    // Persist user prompt
    const userMsg = await chatService.createMessage(defaultUserId, defaultOrgId, {
      conversationId: convId,
      role: "user",
      content: "Initiate risk evaluation for autonomous directives.",
    });
    expect(userMsg.error).toBeNull();
    expect(userMsg.data?.content).toContain("Initiate risk evaluation");

    // Persist assistant response
    const assistantMsg = await chatService.createMessage(defaultUserId, defaultOrgId, {
      conversationId: convId,
      role: "assistant",
      content: "Risk assessment framework initialized. All tiers require human approval.",
      metadata: { model: "gemini-1.5-flash", status: "complete" },
    });
    expect(assistantMsg.error).toBeNull();
    expect(assistantMsg.data?.role).toBe("assistant");

    // Retrieve history
    const historyRes = await chatService.listMessages(defaultUserId, defaultOrgId, convId);
    expect(historyRes.error).toBeNull();
    expect(historyRes.data.length).toBe(2);
    expect(historyRes.data[0].role).toBe("user");
    expect(historyRes.data[1].role).toBe("assistant");
  });

  it("should cascade delete messages when a conversation is deleted", async () => {
    const convRes = await chatService.createConversation(
      defaultUserId,
      defaultOrgId,
      "Temporary Session"
    );
    const convId = convRes.data!.id;

    await chatService.createMessage(defaultUserId, defaultOrgId, {
      conversationId: convId,
      role: "user",
      content: "Test message",
    });

    const deleteRes = await chatService.deleteConversation(defaultUserId, defaultOrgId, convId);
    expect(deleteRes.success).toBe(true);

    // Verify conversation is gone
    const getRes = await chatService.getConversation(defaultUserId, defaultOrgId, convId);
    expect(getRes.data).toBeNull();

    // Verify messages are cascaded
    const msgsRes = await chatService.listMessages(defaultUserId, defaultOrgId, convId);
    expect(msgsRes.data.length).toBe(0);
  });
});
