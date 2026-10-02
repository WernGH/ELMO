import { NextRequest, NextResponse } from "next/server";
import { ElmoOrchestratorService } from "@/services/agentic/elmo-orchestrator.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      objective,
      organizationId = "11111111-1111-1111-1111-111111111111",
      userId = "00000000-0000-0000-0000-000000000001",
      targetWorkerId,
      context = {},
    } = body;

    if (!objective || typeof objective !== "string" || objective.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "A non-empty business objective is required." },
        { status: 400 }
      );
    }

    const orchestrator = ElmoOrchestratorService.getInstance();
    const workforceRegistry = WorkforceRegistryService.getInstance();

    const result = await orchestrator.orchestrate({
      userId,
      organizationId,
      message: objective.trim(),
      context: {
        ...context,
        targetWorkerId,
        dispatchedFromConsole: true,
      },
    });

    const executionId = result.plan?.executionId || (result as any).canonicalExecution?.id;
    const handoffs = executionId
      ? workforceRegistry.getWorkerHandoffs(executionId)
      : workforceRegistry.getWorkerHandoffs(organizationId).slice(-5);

    return NextResponse.json({
      success: true,
      data: {
        visualState: result.visualState,
        plan: result.plan,
        canonicalExecution: result.canonicalExecution,
        response: result.response,
        agentResults: result.agentResults,
        pendingApproval: result.pendingApproval,
        isDirectAnswer: result.isDirectAnswer,
        handoffs,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to dispatch workforce task" },
      { status: 500 }
    );
  }
}
