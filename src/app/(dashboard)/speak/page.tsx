"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FullScreenSpeakMode } from "@/components/voice/FullScreenSpeakMode";
import { AuthService } from "@/services/auth.service";
import { ChatService } from "@/services/chat.service";
import { ConversationMessage } from "@/components/voice/LiveConversationPanel";

export default function SpeakPage() {
  const router = useRouter();
  const [session, setSession] = useState<{ userId: string; orgId: string } | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([
    {
      id: "init-speak",
      role: "assistant",
      content:
        "All systems online. Full-screen speak mode active. Speak naturally without wake words.",
      timestamp: "Online",
    },
  ]);

  const authService = AuthService.getInstance();
  const chatService = ChatService.getInstance();

  useEffect(() => {
    async function init() {
      const sess = await authService.getSession();
      const orgId = sess.activeOrganizationId || "11111111-1111-1111-1111-111111111111";
      const userId = sess.user?.id || "00000000-0000-0000-0000-000000000001";
      setSession({ userId, orgId });

      try {
        const { data: convs } = await chatService.listConversations(userId, orgId);
        if (convs && convs.length > 0) {
          const { data: pastMsgs } = await chatService.listMessages(userId, orgId, convs[0].id);
          if (pastMsgs && pastMsgs.length > 0) {
            setMessages(
              pastMsgs.slice(-10).map((m: any) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                created_at: m.created_at,
              }))
            );
          }
        }
      } catch {
        // keep initial messages
      }
    }
    init();
  }, []);

  return (
    <FullScreenSpeakMode
      isOpen={true}
      onClose={() => router.push("/overview")}
      initialMessages={messages}
      organizationId={session?.orgId}
      userId={session?.userId}
    />
  );
}
