import { NextRequest } from "next/server";
import { OutcomeService } from "@/services/agentic/outcome.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const outcomeId = params.id;
  const url = new URL(req.url);
  const orgId =
    url.searchParams.get("organizationId") ||
    "11111111-1111-1111-1111-111111111111";

  const outcomeService = OutcomeService.getInstance();
  const outcome = outcomeService.getOutcome(outcomeId, orgId);

  if (!outcome) {
    return new Response(
      JSON.stringify({ error: `Outcome ${outcomeId} not found.` }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // 1. Initial snapshot push
      try {
        const workspace = await outcomeService.getUnifiedWorkspace(outcomeId, orgId);
        controller.enqueue(
          encoder.encode(`event: workspace\ndata: ${JSON.stringify(workspace)}\n\n`)
        );
      } catch (err) {
        console.error("[SSE] Failed to encode initial workspace snapshot", err);
      }

      // 2. Periodic poll / push loop to detect state changes in real-time
      const interval = setInterval(async () => {
        if (isClosed || req.signal.aborted) {
          clearInterval(interval);
          return;
        }

        try {
          const workspace = await outcomeService.getUnifiedWorkspace(outcomeId, orgId);
          if (workspace) {
            controller.enqueue(
              encoder.encode(`event: workspace\ndata: ${JSON.stringify(workspace)}\n\n`)
            );
          }
        } catch (err) {
          // Client likely disconnected or error reading workspace
          clearInterval(interval);
        }
      }, 1500);

      // Clean up when request is aborted
      req.signal.addEventListener("abort", () => {
        isClosed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Controller might already be closed
        }
      });
    },
    cancel() {
      isClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
