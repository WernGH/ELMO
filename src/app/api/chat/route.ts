import { NextRequest, NextResponse } from "next/server";
import { ELMOIntelligenceService } from "@/services/elmo-intelligence.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messageContent = body.message?.trim();
    const conversationId = body.conversationId;
    const organizationId = body.organizationId || "11111111-1111-1111-1111-111111111111";
    const userId = body.userId || "00000000-0000-0000-0000-000000000001";
    const explicitLanguage = body.explicitLanguage;

    if (!messageContent) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    const intelligenceService = ELMOIntelligenceService.getInstance();
    const streamGen = intelligenceService.streamMessage({
      userId,
      organizationId,
      conversationId,
      message: messageContent,
      explicitLanguage,
      abortSignal: req.signal,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamGen) {
            if (req.signal.aborted) {
              break;
            }
            const dataStr =
              typeof event.data === "string"
                ? event.data
                : JSON.stringify(event.data);
            controller.enqueue(
              encoder.encode(`event: ${event.event}\ndata: ${dataStr}\n\n`)
            );
          }
        } catch (streamErr: unknown) {
          const errMessage =
            streamErr instanceof Error ? streamErr.message : String(streamErr);
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ error: errMessage })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Internal Chat API Error: ${errorMsg}` },
      { status: 500 }
    );
  }
}
