import { describe, it, expect, beforeEach } from "vitest";
import { OrganizationService } from "@/services/organization.service";
import { MockDataStore } from "@/lib/supabase/mock-store";

describe("OrganizationService - Multi-Tenant Architecture", () => {
  let orgService: OrganizationService;
  let mockStore: MockDataStore;

  beforeEach(() => {
    mockStore = MockDataStore.getInstance();
    mockStore.reset();
    orgService = OrganizationService.getInstance();
  });

  it("should create a new organization with slug and assign creator as owner", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const { data: org, error } = await orgService.createOrganization(
      userId,
      "Quantum Innovations",
      { theme: "dark" }
    );

    expect(error).toBeNull();
    expect(org).toBeDefined();
    expect(org?.name).toBe("Quantum Innovations");
    expect(org?.slug).toContain("quantum-innovations");

    // Verify creator is owner
    const role = mockStore.getOrgRole(userId, org!.id);
    expect(role).toBe("owner");
  });

  it("should allow a member to query their organization", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const defaultOrgId = "11111111-1111-1111-1111-111111111111";

    const { data: org, error } = await orgService.getOrganization(userId, defaultOrgId);
    expect(error).toBeNull();
    expect(org).toBeDefined();
    expect(org?.id).toBe(defaultOrgId);
    expect(org?.role).toBe("owner");
  });

  it("should reject non-members from querying an organization (RLS violation)", async () => {
    const outsiderUserId = "outsider-user-999";
    const targetOrgId = "11111111-1111-1111-1111-111111111111";

    const { data, error } = await orgService.getOrganization(outsiderUserId, targetOrgId);
    expect(data).toBeNull();
    expect(error).toContain("Access denied");
  });

  it("should allow owner to update organization name and settings", async () => {
    const ownerId = "00000000-0000-0000-0000-000000000001";
    const orgId = "11111111-1111-1111-1111-111111111111";

    const { data: updated, error } = await orgService.updateOrganization(ownerId, orgId, {
      name: "ELMO Global Holdings",
      settings: { updated_key: "value" },
    });

    expect(error).toBeNull();
    expect(updated?.name).toBe("ELMO Global Holdings");
  });

  it("should prevent non-admin/non-owner members from updating organization settings", async () => {
    const orgId = "11111111-1111-1111-1111-111111111111";
    const viewerId = "viewer-user-123";

    // Add viewer member
    mockStore.organizationMembers.set("mem-viewer", {
      id: "mem-viewer",
      organization_id: orgId,
      user_id: viewerId,
      role: "viewer",
      created_at: new Date().toISOString(),
    });

    const { data, error } = await orgService.updateOrganization(viewerId, orgId, {
      name: "Malicious Rename",
    });

    expect(data).toBeNull();
    expect(error).toContain("Permission denied");
  });

  it("should allow an owner to delete an organization and clean up associated records", async () => {
    const ownerId = "owner-alpha-123";
    const { data: org } = await orgService.createOrganization(ownerId, "Temporary Business Ventures");
    expect(org).toBeDefined();
    const orgId = org!.id;

    // Verify it exists in store
    expect(mockStore.organizations.has(orgId)).toBe(true);

    const { success, error } = await orgService.deleteOrganization(ownerId, orgId);
    expect(error).toBeNull();
    expect(success).toBe(true);

    // Verify it is removed
    expect(mockStore.organizations.has(orgId)).toBe(false);
  });

  it("should prevent non-owner from deleting an organization", async () => {
    const ownerId = "owner-alpha-123";
    const nonOwnerId = "member-beta-456";

    const { data: org } = await orgService.createOrganization(ownerId, "Valuable Business Co");
    const orgId = org!.id;

    // Add member
    mockStore.organizationMembers.set("mem-beta-test", {
      id: "mem-beta-test",
      organization_id: orgId,
      user_id: nonOwnerId,
      role: "admin",
      created_at: new Date().toISOString(),
    });

    const { success, error } = await orgService.deleteOrganization(nonOwnerId, orgId);
    expect(success).toBe(false);
    expect(error).toContain("Permission denied");
    expect(mockStore.organizations.has(orgId)).toBe(true);
  });

  it("should prevent deletion of protected master root organization", async () => {
    const ownerId = "00000000-0000-0000-0000-000000000001";
    const masterOrgId = "11111111-1111-1111-1111-111111111111";

    const { success, error } = await orgService.deleteOrganization(ownerId, masterOrgId);
    expect(success).toBe(false);
    expect(error).toContain("Protected System Workspace");
    expect(mockStore.organizations.has(masterOrgId)).toBe(true);
  });
});

