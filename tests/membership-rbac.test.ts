import { describe, it, expect, beforeEach } from "vitest";
import { MemberService } from "@/services/member.service";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { ROLE_PERMISSIONS, Role } from "@/types/organization.types";

describe("MemberService & 5-Tier RBAC", () => {
  let memberService: MemberService;
  let mockStore: MockDataStore;
  const orgId = "11111111-1111-1111-1111-111111111111";
  const ownerId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    mockStore = MockDataStore.getInstance();
    mockStore.reset();
    memberService = MemberService.getInstance();
  });

  it("should support all 5 roles and verify role permissions matrix", () => {
    const roles: Role[] = ["owner", "admin", "manager", "member", "viewer"];
    expect(roles.length).toBe(5);

    // Verify Owner permissions
    expect(ROLE_PERMISSIONS.owner.canDeleteOrg).toBe(true);
    expect(ROLE_PERMISSIONS.owner.canManageMembers).toBe(true);
    expect(ROLE_PERMISSIONS.owner.canDirectELMO).toBe(true);

    // Verify Admin permissions
    expect(ROLE_PERMISSIONS.admin.canDeleteOrg).toBe(false);
    expect(ROLE_PERMISSIONS.admin.canManageMembers).toBe(true);
    expect(ROLE_PERMISSIONS.admin.canDirectELMO).toBe(true);

    // Verify Manager permissions
    expect(ROLE_PERMISSIONS.manager.canManageMembers).toBe(false);
    expect(ROLE_PERMISSIONS.manager.canDirectELMO).toBe(true);

    // Verify Member permissions
    expect(ROLE_PERMISSIONS.member.canManageMembers).toBe(false);
    expect(ROLE_PERMISSIONS.member.canDirectELMO).toBe(false);
    expect(ROLE_PERMISSIONS.member.canViewReports).toBe(true);

    // Verify Viewer permissions
    expect(ROLE_PERMISSIONS.viewer.canDirectELMO).toBe(false);
    expect(ROLE_PERMISSIONS.viewer.canViewReports).toBe(true);
  });

  it("should allow an owner to add a member with any valid role", async () => {
    const { data: member, error } = await memberService.addMember(
      ownerId,
      orgId,
      "colleague@elmo-ai.com",
      "manager"
    );

    expect(error).toBeNull();
    expect(member).toBeDefined();
    expect(member?.role).toBe("manager");
  });

  it("should prevent non-owners/non-admins from adding members", async () => {
    const regularMemberId = "reg-member-1";
    mockStore.organizationMembers.set("mem-regular", {
      id: "mem-regular",
      organization_id: orgId,
      user_id: regularMemberId,
      role: "member",
      created_at: new Date().toISOString(),
    });

    const { data, error } = await memberService.addMember(
      regularMemberId,
      orgId,
      "unauthorized@elmo-ai.com",
      "viewer"
    );

    expect(data).toBeNull();
    expect(error).toContain("Permission denied");
  });

  it("should prevent an admin from promoting someone to owner", async () => {
    const adminId = "admin-user-1";
    mockStore.organizationMembers.set("mem-admin", {
      id: "mem-admin",
      organization_id: orgId,
      user_id: adminId,
      role: "admin",
      created_at: new Date().toISOString(),
    });

    const { data, error } = await memberService.addMember(
      adminId,
      orgId,
      "newowner@elmo-ai.com",
      "owner"
    );

    expect(data).toBeNull();
    expect(error).toContain("Only the owner can assign the owner role");
  });

  it("should prevent removing the only owner of an organization", async () => {
    const result = await memberService.removeMember(ownerId, orgId, ownerId);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot remove the only owner");
  });
});
