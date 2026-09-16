import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { Organization, OrganizationWithMemberRole, Role } from "@/types/organization.types";
import { Json } from "@/types/database.types";
import { slugify } from "@/lib/utils";

export class OrganizationService {
  private static instance: OrganizationService;
  private mockStore = MockDataStore.getInstance();

  public static getInstance(): OrganizationService {
    if (!OrganizationService.instance) {
      OrganizationService.instance = new OrganizationService();
    }
    return OrganizationService.instance;
  }

  /**
   * Create a new organization and assign the creator as 'owner'
   */
  public async createOrganization(
    userId: string,
    name: string,
    settings: Record<string, unknown> = {}
  ): Promise<{ data: Organization | null; error: string | null }> {
    try {
      const slug = `${slugify(name)}-${Date.now().toString().slice(-4)}`;

      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data: org, error: orgError } = await (supabase.from("organizations") as any)
          .insert({
            name,
            slug,
            settings: {
              autonomy_mode: "supervised",
              elmo_status: "active",
              ...settings,
            },
          })
          .select()
          .single();

        if (orgError || !org) {
          return { data: null, error: orgError?.message || "Failed to create organization." };
        }

        const { error: memberError } = await (supabase.from("organization_members") as any)
          .insert({
            organization_id: (org as any).id,
            user_id: userId,
            role: "owner",
          });

        if (memberError) {
          return { data: null, error: memberError.message };
        }

        return { data: org as Organization, error: null };
      }

      // Mock Store
      const orgId = `org-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newOrg: Organization = {
        id: orgId,
        name,
        slug,
        settings: {
          autonomy_mode: "supervised",
          elmo_status: "active",
          ...settings,
        } as Json,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.mockStore.organizations.set(orgId, newOrg);

      const memberId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      this.mockStore.organizationMembers.set(memberId, {
        id: memberId,
        organization_id: orgId,
        user_id: userId,
        role: "owner",
        created_at: new Date().toISOString(),
      });

      return { data: newOrg, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error creating organization.";
      return { data: null, error: message };
    }
  }

  /**
   * Get an organization by ID with membership validation (RLS enforcement)
   */
  public async getOrganization(
    userId: string,
    orgId: string
  ): Promise<{ data: OrganizationWithMemberRole | null; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        // Supabase RLS will return zero rows if user is not a member!
        const { data: org, error: orgError } = await (supabase.from("organizations") as any)
          .select("*")
          .eq("id", orgId)
          .single();

        if (orgError || !org) {
          return { data: null, error: "Organization not found or access denied by RLS policy." };
        }

        const { data: member } = await (supabase.from("organization_members") as any)
          .select("role")
          .eq("organization_id", orgId)
          .eq("user_id", userId)
          .single();

        return {
          data: {
            ...(org as Organization),
            role: ((member as any)?.role as Role) || "viewer",
          },
          error: null,
        };
      }

      // Mock Store with RLS enforcement
      if (!this.mockStore.isOrgMember(userId, orgId)) {
        return { data: null, error: "Access denied: User is not a member of this organization (RLS violation)." };
      }

      const org = this.mockStore.organizations.get(orgId);
      if (!org) {
        return { data: null, error: "Organization not found." };
      }

      const role = this.mockStore.getOrgRole(userId, orgId) || "viewer";

      return {
        data: {
          ...org,
          role,
        },
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error fetching organization.";
      return { data: null, error: message };
    }
  }

  /**
   * Get all organizations that a user belongs to
   */
  public async getUserOrganizations(userId: string): Promise<OrganizationWithMemberRole[]> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data: memberships } = await (supabase.from("organization_members") as any)
        .select("organization_id, role")
        .eq("user_id", userId);

      if (!memberships || (memberships as any[]).length === 0) return [];

      const orgIds = (memberships as any[]).map((m: any) => m.organization_id);
      const { data: orgs } = await (supabase.from("organizations") as any)
        .select("*")
        .in("id", orgIds);

      if (!orgs) return [];

      return (orgs as any[]).map((org: any) => {
        const mem = (memberships as any[]).find((m: any) => m.organization_id === org.id);
        return {
          ...(org as Organization),
          role: (mem?.role as Role) || "viewer",
        };
      });
    }

    // Mock Store RLS Query
    const userOrgs = this.mockStore.queryOrganizationsWithRLS(userId);
    return userOrgs.map((org) => ({
      ...org,
      role: this.mockStore.getOrgRole(userId, org.id) || "viewer",
    }));
  }

  /**
   * Update organization settings (Restricted to 'owner' or 'admin')
   */
  public async updateOrganization(
    userId: string,
    orgId: string,
    updates: { name?: string; settings?: Record<string, unknown> }
  ): Promise<{ data: Organization | null; error: string | null }> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await (supabase.from("organizations") as any)
          .update(updates)
          .eq("id", orgId)
          .select()
          .single();

        if (error) {
          return { data: null, error: error.message };
        }
        return { data: data as Organization, error: null };
      }

      // Mock Store RBAC Check
      const role = this.mockStore.getOrgRole(userId, orgId);
      if (!role || (role !== "owner" && role !== "admin")) {
        return { data: null, error: "Permission denied: Only owners or admins can update organization settings." };
      }

      const org = this.mockStore.organizations.get(orgId);
      if (!org) return { data: null, error: "Organization not found." };

      const currentSettings = (typeof org.settings === "object" && org.settings !== null && !Array.isArray(org.settings))
        ? org.settings as Record<string, unknown>
        : {};

      const updated: Organization = {
        ...org,
        ...(updates.name && { name: updates.name }),
        ...(updates.settings && { settings: { ...currentSettings, ...updates.settings } as Json }),
        updated_at: new Date().toISOString(),
      };

      this.mockStore.organizations.set(orgId, updated);
      return { data: updated, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error updating organization.";
      return { data: null, error: message };
    }
  }
}
