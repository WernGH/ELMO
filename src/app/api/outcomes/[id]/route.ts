import { NextRequest, NextResponse } from "next/server";
import { OutcomeService } from "@/services/agentic/outcome.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const outcomeId = params.id;
    const url = new URL(req.url);
    const orgId = url.searchParams.get("organizationId") || "11111111-1111-1111-1111-111111111111";

    const outcomeService = OutcomeService.getInstance();
    const outcome = outcomeService.getOutcome(outcomeId, orgId);

    if (!outcome) {
      return NextResponse.json(
        { success: false, error: `Outcome "${outcomeId}" not found.` },
        { status: 404 }
      );
    }

    const isWorkspace = url.searchParams.get("workspace") === "true";
    const workspace = await outcomeService.getUnifiedWorkspace(outcomeId, orgId);

    if (isWorkspace) {
      return NextResponse.json({
        success: true,
        data: workspace,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...outcome,
        unifiedWorkspace: workspace,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve outcome" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const outcomeId = params.id;
    const body = await req.json();
    const {
      action,
      organizationId = "11111111-1111-1111-1111-111111111111",
      measuredResult,
      reason,
    } = body;

    const outcomeService = OutcomeService.getInstance();

    if (action === "start") {
      const outcome = outcomeService.startExecution(outcomeId, organizationId);
      return NextResponse.json({ success: true, data: outcome });
    }

    if (action === "verify") {
      const outcome = outcomeService.verifyOutcome(outcomeId, organizationId, measuredResult);
      return NextResponse.json({ success: true, data: outcome });
    }

    if (action === "approve") {
      const outcome = outcomeService.approveOutcome(outcomeId, organizationId);
      return NextResponse.json({ success: true, data: outcome });
    }

    if (action === "reject") {
      const outcome = outcomeService.rejectOutcome(outcomeId, organizationId, reason);
      return NextResponse.json({ success: true, data: outcome });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action "${action}". Valid actions: start, verify, approve, reject.` },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute outcome action" },
      { status: 500 }
    );
  }
}
