/**
 * ELMO Phase 4 — Workforce Registry & Lifecycle Test Suite
 *
 * Verifies:
 * 1. Initial registration of the 7 foundational specialist workers.
 * 2. Worker definition schema, status, capacity, and role validation.
 * 3. Transparent alias resolution between legacy agents and workforce workers.
 * 4. Full worker lifecycle: create, get, update, enable, disable, archive.
 * 5. Multi-tenant assignment tracking, workload increment/decrement, and capacity limits.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AgentRegistryService } from "@/services/agentic/agent-registry.service";
import { WorkforceRegistryService } from "@/services/agentic/workforce-registry.service";
import { WorkerDefinition } from "@/services/agentic/types/agentic.types";

describe("Phase 4: Governed Workforce Registry & Lifecycle", () => {
  let agentRegistry: AgentRegistryService;
  let workforceRegistry: WorkforceRegistryService;
  const orgId = "org-workforce-test";

  beforeEach(() => {
    agentRegistry = AgentRegistryService.getInstance();
    agentRegistry.reset();
    workforceRegistry = WorkforceRegistryService.getInstance();
    workforceRegistry.reset();
  });

  describe("1. Foundational Specialists Registration", () => {
    it("should initialize the 7 canonical Phase 4 foundational specialist workers", () => {
      const workers = agentRegistry.getWorkers();
      expect(workers.length).toBeGreaterThanOrEqual(7);

      const workerIds = workers.map((w) => w.id);
      expect(workerIds).toContain("research-worker");
      expect(workerIds).toContain("analytics-worker");
      expect(workerIds).toContain("marketing-worker");
      expect(workerIds).toContain("copy-worker");
      expect(workerIds).toContain("sales-worker");
      expect(workerIds).toContain("web-coding-worker");
      expect(workerIds).toContain("operations-worker");
    });

    it("should resolve legacy agent IDs and worker aliases transparently in both directions", () => {
      // Legacy agent ID query should resolve
      const researchAgent = agentRegistry.getAgent("research-agent");
      expect(researchAgent).toBeDefined();
      expect(researchAgent?.id).toBe("research-agent");

      // Worker ID query should resolve to the same underlying agent
      const researchWorker = agentRegistry.getWorker("research-worker");
      expect(researchWorker).toBeDefined();
      expect(researchWorker?.id).toBe("research-worker");
      expect(researchWorker?.role).toBe("RESEARCH");

      // Cross-alias resolution check
      expect(agentRegistry.resolveWorkerAlias("research-worker")).toBe("research-agent");
      expect(agentRegistry.resolveWorkerAlias("copy-worker")).toBe("copy-agent");
      expect(agentRegistry.resolveWorkerAlias("sales-agent")).toBe("sales-worker");
      expect(agentRegistry.resolveWorkerAlias("operations-agent")).toBe("operations-worker");
    });

    it("should verify correct tool permissions for each foundational worker", () => {
      expect(agentRegistry.isToolAllowed("research-worker", "search_knowledge")).toBe(true);
      expect(agentRegistry.isToolAllowed("analytics-worker", "get_dashboard_analytics")).toBe(true);
      expect(agentRegistry.isToolAllowed("marketing-worker", "create_offer_blueprint")).toBe(true);
      expect(agentRegistry.isToolAllowed("copy-worker", "generate_copy_variants")).toBe(true);
      expect(agentRegistry.isToolAllowed("sales-worker", "analyze_sales_funnel")).toBe(true);
      expect(agentRegistry.isToolAllowed("web-coding-worker", "BUILD_PROJECT")).toBe(true);
      expect(agentRegistry.isToolAllowed("operations-worker", "generate_sop_summary")).toBe(true);

      // Unauthorized tools must be rejected
      expect(agentRegistry.isToolAllowed("research-worker", "BUILD_PROJECT")).toBe(false);
      expect(agentRegistry.isToolAllowed("copy-worker", "DROP_DATABASE_TABLE")).toBe(false);
    });
  });

  describe("2. Governed Worker Lifecycle Management", () => {
    it("should allow dynamic creation of custom specialist workers", () => {
      const customWorker = agentRegistry.createWorker({
        id: "crm-integrations-specialist",
        name: "CRM Integrations Specialist",
        description: "Manages webhook syncs and customer lifecycle pipelines.",
        role: "OPERATIONS",
        capabilities: ["webhook_sync", "crm_pipeline_audit"],
        skills: ["Audit", "Sync", "Plan"],
        allowedTools: ["audit_operations_workflow", "query_memory"],
        permissions: ["read:operations"],
        organizationId: orgId,
        capacity: 4,
      });

      expect(customWorker.id).toBe("crm-integrations-specialist");
      expect(customWorker.status).toBe("AVAILABLE");
      expect(customWorker.capacity).toBe(4);
      expect(customWorker.workload).toBe(0);

      const retrieved = agentRegistry.getWorker("crm-integrations-specialist");
      expect(retrieved?.name).toBe("CRM Integrations Specialist");
    });

    it("should support updating worker configuration and status", () => {
      agentRegistry.updateWorker("analytics-worker", {
        capacity: 8,
        status: "MAINTENANCE",
      });

      const updated = agentRegistry.getWorker("analytics-worker");
      expect(updated?.capacity).toBe(8);
      expect(updated?.status).toBe("MAINTENANCE");
    });

    it("should enable and disable workers and enforce tool permission revocation", () => {
      expect(agentRegistry.isToolAllowed("copy-worker", "generate_copy_variants")).toBe(true);

      // Disable copy worker
      agentRegistry.disableWorker("copy-worker");
      const disabled = agentRegistry.getWorker("copy-worker");
      expect(disabled?.enabled).toBe(false);
      expect(disabled?.status).toBe("DISABLED");

      // Permissions must be immediately blocked
      expect(agentRegistry.isToolAllowed("copy-worker", "generate_copy_variants")).toBe(false);

      // Re-enable copy worker
      agentRegistry.enableWorker("copy-worker");
      const enabled = agentRegistry.getWorker("copy-worker");
      expect(enabled?.enabled).toBe(true);
      expect(enabled?.status).toBe("AVAILABLE");
      expect(agentRegistry.isToolAllowed("copy-worker", "generate_copy_variants")).toBe(true);
    });

    it("should archive workers cleanly", () => {
      agentRegistry.createWorker({
        id: "temporary-auditor",
        name: "Temporary Auditor",
        role: "OPERATIONS",
        organizationId: orgId,
      });

      expect(agentRegistry.getWorker("temporary-auditor")).toBeDefined();

      const archived = agentRegistry.archiveWorker("temporary-auditor");
      expect(archived).toBe(true);
      expect(agentRegistry.getWorker("temporary-auditor")).toBeUndefined();
    });
  });

  describe("3. Workload Tracking & Capacity Governance", () => {
    it("should accurately assign worker, track workload, and enforce capacity boundaries", () => {
      const worker = agentRegistry.getWorker("research-worker")!;
      expect(worker.workload).toBe(0);

      // Assign Task 1
      const assignment1 = workforceRegistry.assignWorker({
        workerId: "research-worker",
        taskId: "task-001",
        executionId: "exec-001",
        organizationId: orgId,
        role: "RESEARCH",
      });

      expect(assignment1.status).toBe("ACTIVE");
      const updated1 = agentRegistry.getWorker("research-worker")!;
      expect(updated1.workload).toBe(1);

      // Release Task 1
      const releaseResult = workforceRegistry.releaseWorker({
        workerId: "research-worker",
        taskId: "task-001",
        success: true,
        durationMs: 450,
      });

      expect(releaseResult).toBe(true);
      const updated2 = agentRegistry.getWorker("research-worker")!;
      expect(updated2.workload).toBe(0);
      expect(updated2.performanceMetrics.tasksCompleted).toBe(1);
    });

    it("should reject assignment when worker exceeds maximum capacity", () => {
      agentRegistry.updateWorker("analytics-worker", { capacity: 2 });

      workforceRegistry.assignWorker({
        workerId: "analytics-worker",
        taskId: "task-a",
        executionId: "exec-002",
        organizationId: orgId,
        role: "ANALYTICS",
      });
      workforceRegistry.assignWorker({
        workerId: "analytics-worker",
        taskId: "task-b",
        executionId: "exec-002",
        organizationId: orgId,
        role: "ANALYTICS",
      });

      // Third task should exceed capacity
      expect(() => {
        workforceRegistry.assignWorker({
          workerId: "analytics-worker",
          taskId: "task-c",
          executionId: "exec-002",
          organizationId: orgId,
          role: "ANALYTICS",
        });
      }).toThrow(/capacity limit/i);
    });
  });
});
