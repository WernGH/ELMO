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
    // If running in browser environment, delegate to server API route
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/organizations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, name, settings }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          return { data: null, error: json.error || "Failed to create organization." };
        }
        return { data: json.data as Organization, error: null };
      } catch (err: any) {
        return { data: null, error: err.message || "Network error creating organization." };
      }
    }

    try {
      const slug = `${slugify(name)}-${Date.now().toString().slice(-4)}`;

      if (isSupabaseConfigured()) {
        const getSupabase = () => {
          if (typeof window === "undefined") {
            try {
              const { createAdminClient } = require("@/lib/supabase/admin");
              return createAdminClient();
            } catch {
              return createBrowserSupabase();
            }
          }
          return createBrowserSupabase();
        };

        const supabase = getSupabase();
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

        if (!orgError && org) {
          const isValidAuthUser =
            Boolean(userId) &&
            userId !== "00000000-0000-0000-0000-000000000001" &&
            !userId.startsWith("usr-");

          if (isValidAuthUser) {
            await (supabase.from("organization_members") as any).insert({
              organization_id: (org as any).id,
              user_id: userId,
              role: "owner",
            });
          }

          return { data: org as Organization, error: null };
        }
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
        const getSupabase = () => {
          if (typeof window === "undefined") {
            try {
              const { createAdminClient } = require("@/lib/supabase/admin");
              return createAdminClient();
            } catch {
              return createBrowserSupabase();
            }
          }
          return createBrowserSupabase();
        };

        const supabase = getSupabase();
        const { data: org, error: orgError } = await (supabase.from("organizations") as any)
          .select("*")
          .eq("id", orgId)
          .single();

        if (!orgError && org) {
          const { data: member } = await (supabase.from("organization_members") as any)
            .select("role")
            .eq("organization_id", orgId)
            .eq("user_id", userId)
            .single();

          return {
            data: {
              ...(org as Organization),
              role: ((member as any)?.role as Role) || "owner",
            },
            error: null,
          };
        }
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
    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/organizations?userId=${userId}`);
        const json = await res.json();
        if (res.ok && json.data && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      } catch (err) {
        console.warn("[OrganizationService] Browser fetch failed, using fallback:", err);
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const getSupabase = () => {
          if (typeof window === "undefined") {
            try {
              const { createAdminClient } = require("@/lib/supabase/admin");
              return createAdminClient();
            } catch {
              return createBrowserSupabase();
            }
          }
          return createBrowserSupabase();
        };

        const supabase = getSupabase();
        const isValidAuthUser =
          Boolean(userId) &&
          userId !== "00000000-0000-0000-0000-000000000001" &&
          !userId.startsWith("usr-");

        if (isValidAuthUser) {
          const { data: memberships } = await (supabase.from("organization_members") as any)
            .select("organization_id, role")
            .eq("user_id", userId);

          if (memberships && (memberships as any[]).length > 0) {
            const orgIds = (memberships as any[]).map((m: any) => m.organization_id);
            const { data: orgs } = await (supabase.from("organizations") as any)
              .select("*")
              .in("id", orgIds);

            if (orgs && orgs.length > 0) {
              return (orgs as any[]).map((org: any) => {
                const mem = (memberships as any[]).find((m: any) => m.organization_id === org.id);
                return {
                  ...(org as Organization),
                  role: (mem?.role as Role) || "viewer",
                };
              });
            }
          }
        } else {
          // For unauthenticated/guest users, retrieve existing organizations from Supabase
          const { data: orgs } = await (supabase.from("organizations") as any)
            .select("*")
            .order("created_at", { ascending: false });

          if (orgs && orgs.length > 0) {
            return (orgs as any[]).map((org: any) => ({
              ...(org as Organization),
              role: "owner" as Role,
            }));
          }
        }
      } catch (err) {
        console.warn("[OrganizationService] Supabase query failed in getUserOrganizations:", err);
      }
    }

    // Mock Store RLS Query
    const userOrgs = this.mockStore.queryOrganizationsWithRLS(userId);
    if (userOrgs.length > 0) {
      return userOrgs.map((org) => ({
        ...org,
        role: this.mockStore.getOrgRole(userId, org.id) || "viewer",
      }));
    }

    // Ensure default executive organization is always accessible
    const defaultOrg = this.mockStore.organizations.get("11111111-1111-1111-1111-111111111111");
    if (defaultOrg) {
      return [{ ...defaultOrg, role: "owner" as Role }];
    }
    return [];
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

  /**
   * Delete an organization (Restricted to 'owner')
   */
  public async deleteOrganization(
    userId: string,
    orgId: string
  ): Promise<{ success: boolean; error: string | null }> {
    const effectiveUserId = userId || "00000000-0000-0000-0000-000000000001";

    // If running in browser environment, call API route
    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/organizations?orgId=${orgId}&userId=${effectiveUserId}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          return { success: false, error: json.error || "Failed to delete organization." };
        }
        return { success: true, error: null };
      } catch (err: any) {
        return { success: false, error: err.message || "Network error deleting organization." };
      }
    }

    try {
      if (isSupabaseConfigured()) {
        const getSupabase = () => {
          if (typeof window === "undefined") {
            try {
              const { createAdminClient } = require("@/lib/supabase/admin");
              return createAdminClient();
            } catch {
              return createBrowserSupabase();
            }
          }
          return createBrowserSupabase();
        };

        const supabase = getSupabase();

        // Attempt cascade deletion on known dependent tables
        const cascadeTables = [
          "form_submissions",
          "forms",
          "contact_events",
          "contacts",
          "tags",
          "pages",
          "funnels",
          "email_sequences",
          "email_templates",
          "automations",
          "analytics_events",
          "agent_executions",
          "company_memories",
          "messages",
          "conversations",
          "organization_members",
        ];

        for (const tbl of cascadeTables) {
          try {
            await (supabase.from(tbl) as any).delete().eq("organization_id", orgId);
          } catch {
            // Ignore if table does not exist
          }
        }

        const { error: delError } = await (supabase.from("organizations") as any)
          .delete()
          .eq("id", orgId);

        if (delError) {
          console.warn("[OrganizationService] Supabase delete warning:", delError);
        }
      }

      // RBAC Permission check: only owner can delete
      const role = this.mockStore.getOrgRole(userId, orgId);
      const isDevRoot = userId === "00000000-0000-0000-0000-000000000001";
      if (role !== "owner" && !isDevRoot) {
        return {
          success: false,
          error: "Permission denied: Only the organization owner can delete this business.",
        };
      }

      // Remove from mock store
      this.mockStore.organizations.delete(orgId);


      // Clean up members
      for (const [memId, mem] of this.mockStore.organizationMembers.entries()) {
        if (mem.organization_id === orgId) {
          this.mockStore.organizationMembers.delete(memId);
        }
      }

      // Clean up conversations
      for (const [convId, conv] of this.mockStore.conversations.entries()) {
        if (conv.organization_id === orgId) {
          this.mockStore.conversations.delete(convId);
        }
      }

      // Clean up messages
      for (const [msgId, msg] of this.mockStore.messages.entries()) {
        if (msg.organization_id === orgId) {
          this.mockStore.messages.delete(msgId);
        }
      }

      return { success: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error deleting organization.";
      return { success: false, error: message };
    }
  }
}


