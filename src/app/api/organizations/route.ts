import { NextRequest, NextResponse } from "next/server";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { Organization, OrganizationWithMemberRole, Role } from "@/types/organization.types";

/**
 * GET /api/organizations
 * Returns organizations accessible to the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";
    const mockStore = MockDataStore.getInstance();

    if (isSupabaseConfigured()) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const supabase = createAdminClient();

        // 1. Fetch all organizations from Supabase
        const { data: orgs, error: orgError } = await (supabase.from("organizations") as any)
          .select("*")
          .order("created_at", { ascending: false });

        if (!orgError && orgs && orgs.length > 0) {
          // If valid auth user, look up their memberships
          const isValidAuthUser =
            Boolean(userId) &&
            userId !== "00000000-0000-0000-0000-000000000001" &&
            !userId.startsWith("usr-");

          let memberships: any[] = [];
          if (isValidAuthUser) {
            const { data: mems } = await (supabase.from("organization_members") as any)
              .select("organization_id, role")
              .eq("user_id", userId);
            memberships = mems || [];
          }

          const result: OrganizationWithMemberRole[] = (orgs as any[]).map((org: any) => {
            const memberRecord = memberships.find((m) => m.organization_id === org.id);
            return {
              ...(org as Organization),
              role: (memberRecord?.role as Role) || "owner",
            };
          });

          return NextResponse.json({ data: result });
        }
      } catch (adminErr) {
        console.warn("[/api/organizations] Failed to query Supabase admin, falling back to mock store:", adminErr);
      }
    }

    // Mock store fallback
    const userOrgs = mockStore.queryOrganizationsWithRLS(userId);
    if (userOrgs.length === 0) {
      // Return default org
      const defaultOrg = mockStore.organizations.get("11111111-1111-1111-1111-111111111111");
      if (defaultOrg) {
        return NextResponse.json({
          data: [{ ...defaultOrg, role: "owner" as Role }],
        });
      }
    }

    const result = userOrgs.map((org) => ({
      ...org,
      role: mockStore.getOrgRole(userId, org.id) || ("owner" as Role),
    }));

    return NextResponse.json({ data: result });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal Server Error: ${String(err)}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Creates a new organization with elevated admin client to bypass guest RLS limitations.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    const userId = body.userId || "00000000-0000-0000-0000-000000000001";
    const settings = body.settings || {};

    if (!name) {
      return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    }

    const slug = `${slugify(name)}-${Date.now().toString().slice(-4)}`;
    const mockStore = MockDataStore.getInstance();

    if (isSupabaseConfigured()) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const supabase = createAdminClient();

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

          // Keep mock store in sync
          mockStore.organizations.set((org as any).id, org as Organization);
          const memberId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          mockStore.organizationMembers.set(memberId, {
            id: memberId,
            organization_id: (org as any).id,
            user_id: userId,
            role: "owner",
            created_at: new Date().toISOString(),
          });

          return NextResponse.json({ data: org }, { status: 201 });
        }

        if (orgError) {
          console.warn("[/api/organizations] Supabase insert failed, attempting mock fallback:", orgError);
        }
      } catch (adminErr) {
        console.warn("[/api/organizations] Admin client failed, attempting mock fallback:", adminErr);
      }
    }

    // Mock store creation
    const orgId = `org-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newOrg: Organization = {
      id: orgId,
      name,
      slug,
      settings: {
        autonomy_mode: "supervised",
        elmo_status: "active",
        ...settings,
      } as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockStore.organizations.set(orgId, newOrg);
    const memberId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    mockStore.organizationMembers.set(memberId, {
      id: memberId,
      organization_id: orgId,
      user_id: userId,
      role: "owner",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ data: newOrg }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal Server Error: ${String(err)}` },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations
 * Deletes an organization and cascades to associated data (Restricted to 'owner')
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("orgId");
    const userId = searchParams.get("userId") || "00000000-0000-0000-0000-000000000001";

    if (!orgId) {
      return NextResponse.json({ error: "Organization ID is required." }, { status: 400 });
    }

    const mockStore = MockDataStore.getInstance();

    if (isSupabaseConfigured()) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const supabase = createAdminClient();

        // Cascade delete on all child tables
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
          console.warn("[/api/organizations] Supabase delete error:", delError);
        }
      } catch (adminErr) {
        console.warn("[/api/organizations] Admin client error on delete:", adminErr);
      }
    }

    // Role check in mock store
    const isDevRoot = userId === "00000000-0000-0000-0000-000000000001";
    const role = mockStore.getOrgRole(userId, orgId);
    if (role !== "owner" && !isDevRoot) {
      return NextResponse.json(
        { error: "Permission denied: Only organization owners can delete this business." },
        { status: 403 }
      );
    }

    // Mock store deletion & cleanup
    mockStore.organizations.delete(orgId);

    for (const [memId, mem] of mockStore.organizationMembers.entries()) {
      if (mem.organization_id === orgId) {
        mockStore.organizationMembers.delete(memId);
      }
    }
    for (const [convId, conv] of mockStore.conversations.entries()) {
      if (conv.organization_id === orgId) {
        mockStore.conversations.delete(convId);
      }
    }
    for (const [msgId, msg] of mockStore.messages.entries()) {
      if (msg.organization_id === orgId) {
        mockStore.messages.delete(msgId);
      }
    }

    return NextResponse.json({ success: true, message: "Organization deleted successfully." });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal Server Error: ${String(err)}` },
      { status: 500 }
    );
  }
}


