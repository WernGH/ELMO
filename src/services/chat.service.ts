import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { Conversation, Message, MessageMetadata, MessageRole } from "@/types/chat.types";

function getSupabaseClient() {
  if (
    typeof window === "undefined" &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY.includes("placeholder")
  ) {
    try {
      const { createAdminClient } = require("@/lib/supabase/admin");
      return createAdminClient();
    } catch {
      return createBrowserSupabase();
    }
  }
  return createBrowserSupabase();
}

export class ChatService {
  private static instance: ChatService;
  private mockStore = MockDataStore.getInstance();

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * Lists conversations for a specific organization with tenant isolation
   */
  public async listConversations(
    userId: string,
    organizationId: string
  ): Promise<{ data: Conversation[]; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data, error } = await (supabase.from("conversations") as any)
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          return { data: (data as Conversation[]), error: null };
        }
      }

      // Fallback to Mock Data Store with strict RLS
      const convs = this.mockStore.queryConversationsWithRLS(userId, organizationId);
      return { data: convs, error: null };
    } catch (err) {
      const convs = this.mockStore.queryConversationsWithRLS(userId, organizationId);
      return { data: convs, error: null };
    }
  }

  /**
   * Retrieves a single conversation by ID verifying tenant membership
   */
  public async getConversation(
    userId: string,
    organizationId: string,
    conversationId: string
  ): Promise<{ data: Conversation | null; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data, error } = await (supabase.from("conversations") as any)
          .select("*")
          .eq("id", conversationId)
          .eq("organization_id", organizationId)
          .single();

        if (!error && data) {
          return { data: (data as Conversation), error: null };
        }
      }

      if (!this.mockStore.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Access denied: unauthorized organization." };
      }

      const conv = this.mockStore.conversations.get(conversationId);
      if (!conv || conv.organization_id !== organizationId) {
        return { data: null, error: "Conversation not found." };
      }

      return { data: conv, error: null };
    } catch (err) {
      if (!this.mockStore.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Access denied: unauthorized organization." };
      }
      const conv = this.mockStore.conversations.get(conversationId);
      if (!conv || conv.organization_id !== organizationId) {
        return { data: null, error: "Conversation not found." };
      }
      return { data: null, error: String(err) };
    }
  }

  /**
   * Creates a new conversation belonging to an organization with safe fallback
   */
  public async createConversation(
    userId: string,
    organizationId: string,
    title = "New Executive Session"
  ): Promise<{ data: Conversation | null; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const isValidAuthUser =
          Boolean(userId) &&
          userId !== "00000000-0000-0000-0000-000000000001" &&
          !userId.startsWith("usr-");

        const { data, error } = await (supabase.from("conversations") as any)
          .insert({
            organization_id: organizationId,
            title,
            created_by: isValidAuthUser ? userId : null,
          })
          .select()
          .single();

        if (!error && data) {
          return { data: (data as Conversation), error: null };
        }
      }

      if (!this.mockStore.isOrgMember(userId, organizationId)) {
        // In unauthenticated guest fallback mode, if org is default org, allow it
        if (organizationId !== "11111111-1111-1111-1111-111111111111") {
          return { data: null, error: "Access denied: unauthorized organization." };
        }
      }

      const conv = this.mockStore.createConversation({
        organization_id: organizationId,
        title,
        created_by: userId,
      });

      return { data: conv, error: null };
    } catch (err) {
      const conv = this.mockStore.createConversation({
        organization_id: organizationId,
        title,
        created_by: userId,
      });
      return { data: conv, error: null };
    }
  }

  /**
   * Deletes a conversation and cascades to its messages
   */
  public async deleteConversation(
    userId: string,
    organizationId: string,
    conversationId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { error } = await (supabase.from("conversations") as any)
          .delete()
          .eq("id", conversationId)
          .eq("organization_id", organizationId);

        if (!error) {
          return { success: true, error: null };
        }
      }

      const success = this.mockStore.deleteConversation(userId, organizationId, conversationId);
      return {
        success,
        error: success ? null : "Failed to delete conversation or access denied.",
      };
    } catch (err) {
      const success = this.mockStore.deleteConversation(userId, organizationId, conversationId);
      return { success, error: null };
    }
  }

  /**
   * Lists chronological messages for a conversation
   */
  public async listMessages(
    userId: string,
    organizationId: string,
    conversationId: string
  ): Promise<{ data: Message[]; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data, error } = await (supabase.from("messages") as any)
          .select("*")
          .eq("conversation_id", conversationId)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: true });

        if (!error && data && data.length > 0) {
          return { data: (data as Message[]), error: null };
        }
      }

      const msgs = this.mockStore.queryMessagesWithRLS(userId, organizationId, conversationId);
      return { data: msgs, error: null };
    } catch (err) {
      const msgs = this.mockStore.queryMessagesWithRLS(userId, organizationId, conversationId);
      return { data: msgs, error: null };
    }
  }

  /**
   * Persists a message to a conversation with safe fallback
   */
  public async createMessage(
    userId: string,
    organizationId: string,
    params: {
      conversationId: string;
      role: MessageRole;
      content: string;
      metadata?: MessageMetadata;
    }
  ): Promise<{ data: Message | null; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        const { data, error } = await (supabase.from("messages") as any)
          .insert({
            conversation_id: params.conversationId,
            organization_id: organizationId,
            role: params.role,
            content: params.content,
            metadata: params.metadata || {},
          })
          .select()
          .single();

        if (!error && data) {
          return { data: (data as Message), error: null };
        }
      }

      if (!this.mockStore.isOrgMember(userId, organizationId)) {
        if (organizationId !== "11111111-1111-1111-1111-111111111111") {
          return { data: null, error: "Access denied: unauthorized organization." };
        }
      }

      const msg = this.mockStore.createMessage({
        conversation_id: params.conversationId,
        organization_id: organizationId,
        role: params.role,
        content: params.content,
        metadata: params.metadata || {},
      });

      return { data: msg, error: null };
    } catch (err) {
      const msg = this.mockStore.createMessage({
        conversation_id: params.conversationId,
        organization_id: organizationId,
        role: params.role,
        content: params.content,
        metadata: params.metadata || {},
      });
      return { data: msg, error: null };
    }
  }
}

export { ChatService as ELMOConversationService };
