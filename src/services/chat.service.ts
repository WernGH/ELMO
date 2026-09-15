import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { Conversation, Message, MessageMetadata, MessageRole } from "@/types/chat.types";

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(
    url &&
    !url.includes("placeholder") &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")
  );
};

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
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("conversations") as any)
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false });

        if (error) {
          return { data: [], error: error.message };
        }
        return { data: (data as Conversation[]) || [], error: null };
      }

      // Mock Data Store with strict RLS simulation
      const convs = this.mockStore.queryConversationsWithRLS(userId, organizationId);
      return { data: convs, error: null };
    } catch (err) {
      return { data: [], error: `Failed to list conversations: ${String(err)}` };
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
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("conversations") as any)
          .select("*")
          .eq("id", conversationId)
          .eq("organization_id", organizationId)
          .single();

        if (error) {
          return { data: null, error: error.message };
        }
        return { data: (data as Conversation) || null, error: null };
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
      return { data: null, error: String(err) };
    }
  }

  /**
   * Creates a new conversation belonging to an organization
   */
  public async createConversation(
    userId: string,
    organizationId: string,
    title = "New Executive Session"
  ): Promise<{ data: Conversation | null; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("conversations") as any)
          .insert({
            organization_id: organizationId,
            title,
            created_by: userId,
          })
          .select()
          .single();

        if (error) {
          return { data: null, error: error.message };
        }
        return { data: (data as Conversation) || null, error: null };
      }

      if (!this.mockStore.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Access denied: unauthorized organization." };
      }

      const conv = this.mockStore.createConversation({
        organization_id: organizationId,
        title,
        created_by: userId,
      });

      return { data: conv, error: null };
    } catch (err) {
      return { data: null, error: String(err) };
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
        const supabase = createBrowserSupabase();
        const { error } = await (supabase.from("conversations") as any)
          .delete()
          .eq("id", conversationId)
          .eq("organization_id", organizationId);

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true, error: null };
      }

      const success = this.mockStore.deleteConversation(userId, organizationId, conversationId);
      return {
        success,
        error: success ? null : "Failed to delete conversation or access denied.",
      };
    } catch (err) {
      return { success: false, error: String(err) };
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
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("messages") as any)
          .select("*")
          .eq("conversation_id", conversationId)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: true });

        if (error) {
          return { data: [], error: error.message };
        }
        return { data: (data as Message[]) || [], error: null };
      }

      const msgs = this.mockStore.queryMessagesWithRLS(userId, organizationId, conversationId);
      return { data: msgs, error: null };
    } catch (err) {
      return { data: [], error: String(err) };
    }
  }

  /**
   * Persists a message to a conversation
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
        const supabase = createBrowserSupabase();
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

        if (error) {
          return { data: null, error: error.message };
        }
        return { data: (data as Message) || null, error: null };
      }

      if (!this.mockStore.isOrgMember(userId, organizationId)) {
        return { data: null, error: "Access denied: unauthorized organization." };
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
      return { data: null, error: String(err) };
    }
  }
}

export { ChatService as ELMOConversationService };
