import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/services/chat.service";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId") || "11111111-1111-1111-1111-111111111111";
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";
    const conversationId = params.id;

    const chatService = ChatService.getInstance();
    const [convRes, msgsRes] = await Promise.all([
      chatService.getConversation(userId, orgId, conversationId),
      chatService.listMessages(userId, orgId, conversationId),
    ]);

    if (convRes.error || !convRes.data) {
      return NextResponse.json(
        { error: convRes.error || "Conversation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        conversation: convRes.data,
        messages: msgsRes.data || [],
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal Server Error: ${String(err)}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId") || "11111111-1111-1111-1111-111111111111";
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";
    const conversationId = params.id;

    const chatService = ChatService.getInstance();
    const result = await chatService.deleteConversation(userId, orgId, conversationId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to delete conversation." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal Server Error: ${String(err)}` },
      { status: 500 }
    );
  }
}
