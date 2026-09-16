import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { VoiceSessionData } from "@/services/voice/voice.types";

export const runtime = "nodejs";

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(
    url &&
    !url.includes("placeholder") &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")
  );
};

export async function POST(req: NextRequest) {
  try {
    const session: VoiceSessionData = await req.json();

    if (!session || !session.id || !session.organizationId) {
      return NextResponse.json(
        { error: "Invalid session payload. id and organizationId are required." },
        { status: 400 }
      );
    }

    const mockStore = MockDataStore.getInstance();
    const savedMock = mockStore.upsertVoiceSession(session);

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true, data: savedMock });
    }

    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const supabase = createAdminClient();

      const isValidAuthUser =
        Boolean(session.userId) &&
        session.userId !== "00000000-0000-0000-0000-000000000001" &&
        !session.userId.startsWith("usr-");

      // Persist to real Supabase via elevated admin client
      const { data, error } = await (supabase.from("voice_sessions") as any)
        .upsert({
          id: session.id,
          organization_id: session.organizationId,
          user_id: isValidAuthUser ? session.userId : null,
          started_at: session.startedAt,
          ended_at: session.endedAt || null,
          duration_seconds: session.durationSeconds || 0,
          detected_language: session.detectedLanguage || "auto",
          user_turns_count: session.userTurnsCount || 0,
          assistant_turns_count: session.assistantTurnsCount || 0,
          interruption_count: session.interruptionCount || 0,
          status: session.status || "active",
          metadata: session.metadata || {},
        })
        .select()
        .single();

      if (error) {
        console.warn("[/api/voice/session] Supabase upsert error, falling back to mock:", error.message);
        return NextResponse.json({ success: true, data: savedMock });
      }

      return NextResponse.json({ success: true, data });
    } catch (adminErr) {
      console.warn("[/api/voice/session] Admin client failed, falling back to mock:", adminErr);
      return NextResponse.json({ success: true, data: savedMock });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Voice Session API Error: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId") || "11111111-1111-1111-1111-111111111111";
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";
    const mockStore = MockDataStore.getInstance();

    if (!isSupabaseConfigured()) {
      const sessions = mockStore.queryVoiceSessionsWithRLS(userId, orgId);
      return NextResponse.json({ data: sessions });
    }

    try {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const supabase = createAdminClient();

      const { data, error } = await (supabase.from("voice_sessions") as any)
        .select("*")
        .eq("organization_id", orgId)
        .order("started_at", { ascending: false })
        .limit(50);

      if (error || !data) {
        const sessions = mockStore.queryVoiceSessionsWithRLS(userId, orgId);
        return NextResponse.json({ data: sessions });
      }

      return NextResponse.json({ data });
    } catch (adminErr) {
      const sessions = mockStore.queryVoiceSessionsWithRLS(userId, orgId);
      return NextResponse.json({ data: sessions });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Voice Session Query Error: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}
