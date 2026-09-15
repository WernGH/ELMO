import { NextRequest, NextResponse } from "next/server";
import { ChatService } from "@/services/chat.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId") || "11111111-1111-1111-1111-111111111111";
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";

    const chatService = ChatService.getInstance();
    const { data, error } = await chatService.listConversations(userId, orgId);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal Server Error: ${String(err)}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body.organizationId || "11111111-1111-1111-1111-111111111111";
    const userId = body.userId || "00000000-0000-0000-0000-000000000001";
    const title = body.title || "New Executive Session";

    const chatService = ChatService.getInstance();
    const { data, error } = await chatService.createConversation(userId, orgId, title);

    if (error || !data) {
      return NextResponse.json({ error: error || "Failed to create conversation." }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal Server Error: ${String(err)}` },
      { status: 500 }
    );
  }
}
