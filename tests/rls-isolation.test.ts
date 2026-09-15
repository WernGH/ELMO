import { describe, it, expect, beforeEach } from "vitest";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { RLSAuditService } from "@/services/rls-audit.service";

describe("Security & Multi-Tenant Isolation (RLS)", () => {
  let store: MockDataStore;

  beforeEach(() => {
    store = MockDataStore.getInstance();
    store.reset();
  });

  it("should pass the automated cross-tenant isolation audit", () => {
    const result = RLSAuditService.runCrossTenantIsolationAudit();
    expect(result.tenantIsolationPassed).toBe(true);
    expect(result.rlsPoliciesEnforced).toBe(true);
    expect(result.serviceRoleExclusionPassed).toBe(true);
    expect(result.rbacHierarchyPassed).toBe(true);

    // Verify each individual test passed
    for (const testItem of result.details) {
      expect(testItem.passed).toBe(true);
    }
  });

  it("should strictly prevent User A from seeing Org B in query results", () => {
    const userA = "tenant-user-a";
    const userB = "tenant-user-b";
    const orgA = "tenant-org-a";
    const orgB = "tenant-org-b";

    // Setup Org A and Org B
    store.organizations.set(orgA, {
      id: orgA,
      name: "Tenant Alpha",
      slug: "tenant-alpha",
      settings: { secret: "alpha-vault" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    store.organizations.set(orgB, {
      id: orgB,
      name: "Tenant Beta",
      slug: "tenant-beta",
      settings: { secret: "beta-vault" },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // User A belongs to Org A
    store.organizationMembers.set("mem-a", {
      id: "mem-a",
      organization_id: orgA,
      user_id: userA,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    // User B belongs to Org B
    store.organizationMembers.set("mem-b", {
      id: "mem-b",
      organization_id: orgB,
      user_id: userB,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    // When User A queries organizations with RLS:
    const userAResults = store.queryOrganizationsWithRLS(userA);
    expect(userAResults.map((o) => o.id)).toContain(orgA);
    expect(userAResults.map((o) => o.id)).not.toContain(orgB);

    // When User B queries organizations with RLS:
    const userBResults = store.queryOrganizationsWithRLS(userB);
    expect(userBResults.map((o) => o.id)).toContain(orgB);
    expect(userBResults.map((o) => o.id)).not.toContain(orgA);
  });

  it("should return 0 rows when a user queries member roster of a foreign organization", () => {
    const userA = "tenant-user-a";
    const foreignOrgB = "tenant-org-b";

    const foreignMembers = store.queryMembersWithRLS(userA, foreignOrgB);
    expect(foreignMembers).toHaveLength(0);
  });
});
