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

    if (!isSupabaseConfigured()) {
      const mockStore = MockDataStore.getInstance();
      const saved = mockStore.upsertVoiceSession(session);
      return NextResponse.json({ success: true, data: saved });
    }

    const supabase = createSupabaseClient();

    // Persist to real Supabase
    const { data, error } = await (supabase.from("voice_sessions") as any)
      .upsert({
        id: session.id,
        organization_id: session.organizationId,
        user_id: session.userId,
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
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

    if (!isSupabaseConfigured()) {
      const mockStore = MockDataStore.getInstance();
      const sessions = mockStore.queryVoiceSessionsWithRLS(userId, orgId);
      return NextResponse.json({ data: sessions });
    }

    const supabase = createSupabaseClient();

    const { data, error } = await (supabase.from("voice_sessions") as any)
      .select("*")
      .eq("organization_id", orgId)
      .order("started_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Voice Session Query Error: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}
