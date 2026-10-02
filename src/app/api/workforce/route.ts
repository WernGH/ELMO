import { NextRequest, NextResponse } from "next/server";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("organizationId") || "11111111-1111-1111-1111-111111111111";

    const agentRegistry = AgentRegistryService.getInstance();
    const workforceRegistry = WorkforceRegistryService.getInstance();

    const workers = agentRegistry.getWorkers({ organizationId: orgId });
    const metrics = workforceRegistry.getWorkforcePerformanceMetrics(orgId);
    const recentHandoffs = workforceRegistry.getWorkerHandoffs(orgId).slice(-20);
    const activeAssignments = workforceRegistry.getActiveWorkerAssignments(orgId);

    return NextResponse.json({
      success: true,
      data: {
        workers,
        metrics,
        recentHandoffs,
        activeAssignments,
        totalWorkers: workers.length,
        activeWorkers: workers.filter((w) => w.enabled && w.status !== "DISABLED").length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve workforce state" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, workerId, organizationId = "11111111-1111-1111-1111-111111111111" } = body;

    if (!action || (!workerId && action !== "create")) {
      return NextResponse.json(
        { success: false, error: "Action is required (and workerId for non-create actions)" },
        { status: 400 }
      );
    }

    const agentRegistry = AgentRegistryService.getInstance();
    const workforceRegistry = WorkforceRegistryService.getInstance();

    let updatedWorker;
    if (action === "create") {
      const { name, role, description, capabilities, allowedTools, capacity } = body;
      if (!name || !role) {
        return NextResponse.json(
          { success: false, error: "name and role are required to register a worker" },
          { status: 400 }
        );
      }
      const newWorkerId = body.id || `custom-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36).slice(-4)}`;
      updatedWorker = agentRegistry.createWorker({
        id: newWorkerId,
        name,
        role,
        description: description || `Custom ${role} specialist worker.`,
        capabilities: Array.isArray(capabilities) ? capabilities : (capabilities ? String(capabilities).split(",").map((c: string) => c.trim()) : []),
        allowedTools: Array.isArray(allowedTools) ? allowedTools : [],
        capacity: capacity ? Number(capacity) : 3,
        organizationId,
      });
      workforceRegistry.logActivity({
        organizationId,
        workerId: newWorkerId,
        eventType: "WORKER_STATUS_CHANGED",
        status: "AVAILABLE",
        metadata: { action: "create", role, name },
      });
    } else if (action === "enable") {
      updatedWorker = agentRegistry.enableWorker(workerId);
      workforceRegistry.logActivity({
        organizationId,
        workerId,
        eventType: "WORKER_STATUS_CHANGED",
        status: "AVAILABLE",
        metadata: { action: "enable" },
      });
    } else if (action === "disable") {
      updatedWorker = agentRegistry.disableWorker(workerId);
      workforceRegistry.logActivity({
        organizationId,
        workerId,
        eventType: "WORKER_STATUS_CHANGED",
        status: "DISABLED",
        metadata: { action: "disable" },
      });
    } else if (action === "pause") {
      updatedWorker = agentRegistry.updateWorker(workerId, { status: "PAUSED" });
      workforceRegistry.logActivity({
        organizationId,
        workerId,
        eventType: "WORKER_STATUS_CHANGED",
        status: "PAUSED",
        metadata: { action: "pause" },
      });
    } else if (action === "resume") {
      updatedWorker = agentRegistry.updateWorker(workerId, { status: "AVAILABLE" });
      workforceRegistry.logActivity({
        organizationId,
        workerId,
        eventType: "WORKER_STATUS_CHANGED",
        status: "AVAILABLE",
        metadata: { action: "resume" },
      });
    } else {
      return NextResponse.json(
        { success: false, error: `Unknown workforce action: ${action}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedWorker,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update worker state" },
      { status: 500 }
    );
  }
}
