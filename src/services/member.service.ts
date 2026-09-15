import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { MemberWithProfile, Role } from "@/types/organization.types";

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(
    url &&
    !url.includes("placeholder") &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder")
  );
};

export class MemberService {
  private static instance: MemberService;
  private mockStore = MockDataStore.getInstance();

  public static getInstance(): MemberService {
    if (!MemberService.instance) {
      MemberService.instance = new MemberService();
    }
    return MemberService.instance;
  }

  /**
   * Get all members of an organization (RLS enforced)
   */
  public async getMembers(
    requesterUserId: string,
    orgId: string
  ): Promise<{ data: MemberWithProfile[]; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data: members, error: memError } = await (supabase.from("organization_members") as any)
          .select("*, profiles(*)")
          .eq("organization_id", orgId);

        if (memError) {
          return { data: [], error: memError.message };
        }

        const formatted = (members || []).map((m: any) => ({
          ...m,
          profile: m.profiles || null,
        }));

        return { data: formatted, error: null };
      }

      // Mock Store RLS Check
      if (!this.mockStore.isOrgMember(requesterUserId, orgId)) {
        return { data: [], error: "Access denied by RLS: You are not a member of this organization." };
      }

      const members = this.mockStore.queryMembersWithRLS(requesterUserId, orgId);
      const formatted: MemberWithProfile[] = members.map((m) => {
        const profile = this.mockStore.profiles.get(m.user_id) || null;
        const user = this.mockStore.users.get(m.user_id);
        return {
          ...m,
          profile,
          email: user?.email,
        };
      });

      return { data: formatted, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error getting members.";
      return { data: [], error: message };
    }
  }

  /**
   * Add / Invite a member to the organization
   */
  public async addMember(
    requesterUserId: string,
    orgId: string,
    userEmail: string,
    role: Role
  ): Promise<{ data: MemberWithProfile | null; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        // Look up profile by email or user
        const { data: existingUser } = await (supabase.from("profiles") as any)
          .select("id, user_id")
          .limit(1)
          .single();

        if (!existingUser) {
          return { data: null, error: "User not found." };
        }

        const { data: member, error } = await (supabase.from("organization_members") as any)
          .insert({
            organization_id: orgId,
            user_id: (existingUser as any).user_id,
            role,
          })
          .select()
          .single();

        if (error) {
          return { data: null, error: error.message };
        }

        return { data: { ...(member as any), profile: null }, error: null };
      }

      // Mock Store RBAC Check
      const requesterRole = this.mockStore.getOrgRole(requesterUserId, orgId);
      if (!requesterRole || (requesterRole !== "owner" && requesterRole !== "admin")) {
        return { data: null, error: "Permission denied: Only owners or admins can add members." };
      }

      if (role === "owner" && requesterRole !== "owner") {
        return { data: null, error: "Permission denied: Only the owner can assign the owner role." };
      }

      // Find or create mock user for email
      let targetUser = Array.from(this.mockStore.users.values()).find(
        (u) => u.email.toLowerCase() === userEmail.toLowerCase()
      );

      if (!targetUser) {
        const newUserId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        targetUser = {
          id: newUserId,
          email: userEmail,
          passwordHash: "password123",
        };
        this.mockStore.users.set(newUserId, targetUser);

        const displayName = userEmail.split("@")[0];
        const newProfile = {
          id: `prof-${newUserId}`,
          user_id: newUserId,
          display_name: displayName,
          avatar_url: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.mockStore.profiles.set(newUserId, newProfile);
      }

      // Check if already member
      if (this.mockStore.isOrgMember(targetUser.id, orgId)) {
        return { data: null, error: "User is already a member of this organization." };
      }

      const memberId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newMember = {
        id: memberId,
        organization_id: orgId,
        user_id: targetUser.id,
        role,
        created_at: new Date().toISOString(),
      };

      this.mockStore.organizationMembers.set(memberId, newMember);
      const profile = this.mockStore.profiles.get(targetUser.id) || null;

      return {
        data: {
          ...newMember,
          profile,
          email: targetUser.email,
        },
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error adding member.";
      return { data: null, error: message };
    }
  }

  /**
   * Update a member's role
   */
  public async updateRole(
    requesterUserId: string,
    orgId: string,
    targetUserId: string,
    newRole: Role
  ): Promise<{ success: boolean; error: string | null }> {
    const requesterRole = this.mockStore.getOrgRole(requesterUserId, orgId);
    if (!requesterRole || (requesterRole !== "owner" && requesterRole !== "admin")) {
      return { success: false, error: "Permission denied: Only owners or admins can change roles." };
    }

    if (newRole === "owner" && requesterRole !== "owner") {
      return { success: false, error: "Permission denied: Only the owner can promote another user to owner." };
    }

    // Find member record
    const memberEntry = Array.from(this.mockStore.organizationMembers.entries()).find(
      ([, m]) => m.organization_id === orgId && m.user_id === targetUserId
    );

    if (!memberEntry) {
      return { success: false, error: "Member not found in organization." };
    }

    const [memberId, member] = memberEntry;
    this.mockStore.organizationMembers.set(memberId, {
      ...member,
      role: newRole,
    });

    return { success: true, error: null };
  }

  /**
   * Remove a member from an organization
   */
  public async removeMember(
    requesterUserId: string,
    orgId: string,
    targetUserId: string
  ): Promise<{ success: boolean; error: string | null }> {
    const requesterRole = this.mockStore.getOrgRole(requesterUserId, orgId);
    const isSelfRemoval = requesterUserId === targetUserId;

    if (!isSelfRemoval && (!requesterRole || (requesterRole !== "owner" && requesterRole !== "admin"))) {
      return { success: false, error: "Permission denied: Only owners or admins can remove members." };
    }

    // Guard: Cannot remove the last owner
    const targetRole = this.mockStore.getOrgRole(targetUserId, orgId);
    if (targetRole === "owner") {
      const allMembers = this.mockStore.queryMembersWithRLS(requesterUserId, orgId);
      const ownerCount = allMembers.filter((m) => m.role === "owner").length;
      if (ownerCount <= 1) {
        return { success: false, error: "Cannot remove the only owner of the organization." };
      }
    }

    const memberEntry = Array.from(this.mockStore.organizationMembers.entries()).find(
      ([, m]) => m.organization_id === orgId && m.user_id === targetUserId
    );

    if (!memberEntry) {
      return { success: false, error: "Member not found." };
    }

    this.mockStore.organizationMembers.delete(memberEntry[0]);
    return { success: true, error: null };
  }
}
