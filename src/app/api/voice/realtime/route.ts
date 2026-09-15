import { NextRequest, NextResponse } from "next/server";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const sessionId = searchParams.get("sessionId");

  if (action === "handshake") {
    return NextResponse.json({
      status: "ready",
      sessionId: sessionId || `vses_${Date.now()}`,
      provider: "gemini-live",
      languageMode: "auto",
      supportedLanguages: "all",
    });
  }

  return NextResponse.json({ status: "online" });
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "interrupt") {
    return NextResponse.json({
      status: "interrupted",
      timestamp: Date.now(),
    });
  }

  try {
    const body = await req.json();
    const prompt = body.prompt || body.transcript || body.text;
    const conversationId = body.conversationId;
    const organizationId = body.organizationId || "11111111-1111-1111-1111-111111111111";
    const userId = body.userId || "00000000-0000-0000-0000-000000000001";

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ status: "acknowledged", timestamp: Date.now() });
    }

    const elmo = ELMOIntelligenceService.getInstance();
    const result = await elmo.processMessage({
      userId,
      organizationId,
      conversationId,
      message: prompt.trim(),
      inputMode: "voice",
    });

    return NextResponse.json({
      success: true,
      text: result.text,
      transcript: result.text,
      conversationId: result.conversationId,
      detectedLanguage: result.detectedLanguage,
      responseLanguage: result.responseLanguage,
      intent: result.intent,
      model: result.model,
      latencyMs: result.latencyMs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Realtime Voice Processing Error: ${err?.message || String(err)}` },
      { status: 500 }
    );
  }
}
