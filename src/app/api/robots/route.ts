import { NextRequest, NextResponse } from "next/server";
import { RobotIdentityService } from "@/services/agentic/robot-identity.service";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const outcomeId = url.searchParams.get("outcomeId") || undefined;

    const robotService = RobotIdentityService.getInstance();
    const robots = robotService.getAllRobots();
    const messages = robotService.getMessages(outcomeId, 30);

    return NextResponse.json({
      success: true,
      data: {
        robots,
        messages,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to list robots" },
      { status: 500 }
    );
  }
}
