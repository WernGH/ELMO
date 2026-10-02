import { NextRequest, NextResponse } from "next/server";
import { OutcomeService } from "@/services/agentic/outcome.service";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orgId = url.searchParams.get("organizationId") || "11111111-1111-1111-1111-111111111111";
    const status = url.searchParams.get("status") as any;

    const outcomeService = OutcomeService.getInstance();
    const outcomes = outcomeService.listOutcomes(orgId, status ? { status } : undefined);

    return NextResponse.json({
      success: true,
      data: outcomes,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list outcomes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      organizationId = "11111111-1111-1111-1111-111111111111",
      userId = "00000000-0000-0000-0000-000000000001",
      targetMetric,
      successCriteria,
      requiredCapabilities,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "A non-empty outcome title is required." },
        { status: 400 }
      );
    }

    const outcomeService = OutcomeService.getInstance();
    const outcome = await outcomeService.createOutcome({
      title: title.trim(),
      description,
      organizationId,
      userId,
      targetMetric,
      successCriteria,
      requiredCapabilities,
    });

    return NextResponse.json({
      success: true,
      data: outcome,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create desired outcome" },
      { status: 500 }
    );
  }
}
