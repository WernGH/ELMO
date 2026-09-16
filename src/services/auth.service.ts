import { createClient as createBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { MockDataStore } from "@/lib/supabase/mock-store";
import { AuthResponse, SignInPayload, SignUpPayload, UserSession } from "@/types/auth.types";
import { Profile } from "@/types/organization.types";
import { slugify } from "@/lib/utils";

export class AuthService {
  private static instance: AuthService;
  private mockStore = MockDataStore.getInstance();

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user, create their profile, and automatically provision their initial organization.
   */
  public async signUp(payload: SignUpPayload): Promise<AuthResponse<{ user: UserSession["user"]; profile: Profile; organizationId: string }>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: payload.email,
          password: payload.password,
          options: {
            data: {
              display_name: payload.displayName,
            },
          },
        });

        if (authError || !authData.user) {
          return { data: null, error: authError?.message || "Failed to create user account." };
        }

        const userId = authData.user.id;

        // Fetch profile
        const { data: profile } = await (supabase.from("profiles") as any)
          .select("*")
          .eq("user_id", userId)
          .single();

        // Create organization
        const orgName = payload.organizationName || `${payload.displayName}'s Organization`;
        const slug = `${slugify(orgName)}-${Date.now().toString().slice(-4)}`;

        const { data: org, error: orgError } = await (supabase.from("organizations") as any)
          .insert({
            name: orgName,
            slug,
            settings: {
              autonomy_mode: "supervised",
              elmo_status: "active",
            },
          })
          .select()
          .single();

        if (orgError || !org) {
          return { data: null, error: orgError?.message || "Failed to create organization." };
        }

        // Add user as owner
        const { error: memberError } = await (supabase.from("organization_members") as any)
          .insert({
            organization_id: (org as any).id,
            user_id: userId,
            role: "owner",
          });

        if (memberError) {
          return { data: null, error: memberError.message };
        }

        return {
          data: {
            user: {
              id: userId,
              email: payload.email,
              displayName: payload.displayName,
            },
            profile: (profile as Profile) || {
              id: userId,
              user_id: userId,
              display_name: payload.displayName,
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            organizationId: (org as any).id,
          },
          error: null,
        };
      }

      // Local / Offline Mock Mode
      const existingUser = Array.from(this.mockStore.users.values()).find(
        (u) => u.email.toLowerCase() === payload.email.toLowerCase()
      );
      if (existingUser) {
        return { data: null, error: "A user with this email already exists." };
      }

      const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      this.mockStore.users.set(userId, {
        id: userId,
        email: payload.email,
        passwordHash: payload.password,
      });

      const profile: Profile = {
        id: `prof-${userId}`,
        user_id: userId,
        display_name: payload.displayName,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.mockStore.profiles.set(userId, profile);

      const orgName = payload.organizationName || `${payload.displayName}'s Organization`;
      const orgId = `org-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const slug = `${slugify(orgName)}-${Date.now().toString().slice(-4)}`;

      this.mockStore.organizations.set(orgId, {
        id: orgId,
        name: orgName,
        slug,
        settings: {
          autonomy_mode: "supervised",
          elmo_status: "active",
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const memberId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      this.mockStore.organizationMembers.set(memberId, {
        id: memberId,
        organization_id: orgId,
        user_id: userId,
        role: "owner",
        created_at: new Date().toISOString(),
      });

      // Save session in local storage for browser client if available
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "elmo_session",
          JSON.stringify({
            userId,
            email: payload.email,
            displayName: payload.displayName,
            activeOrganizationId: orgId,
          })
        );
      }

      return {
        data: {
          user: {
            id: userId,
            email: payload.email,
            displayName: payload.displayName,
          },
          profile,
          organizationId: orgId,
        },
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error during signup.";
      return { data: null, error: message };
    }
  }

  /**
   * Log in user with email & password
   */
  public async signIn(payload: SignInPayload): Promise<AuthResponse<{ user: UserSession["user"]; organizationId: string }>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: payload.email,
          password: payload.password,
        });

        if (error || !data.user) {
          return { data: null, error: error?.message || "Invalid credentials." };
        }

        // Get user's primary organization
        const { data: member } = await (supabase.from("organization_members") as any)
          .select("organization_id")
          .eq("user_id", data.user.id)
          .limit(1)
          .single();

        return {
          data: {
            user: {
              id: data.user.id,
              email: data.user.email || payload.email,
              displayName: data.user.user_metadata?.display_name || "User",
            },
            organizationId: (member as any)?.organization_id || "",
          },
          error: null,
        };
      }

      // Mock Mode Authentication
      const user = Array.from(this.mockStore.users.values()).find(
        (u) => u.email.toLowerCase() === payload.email.toLowerCase()
      );

      if (!user || user.passwordHash !== payload.password) {
        return { data: null, error: "Invalid email or password." };
      }

      const profile = this.mockStore.profiles.get(user.id);
      const member = Array.from(this.mockStore.organizationMembers.values()).find(
        (m) => m.user_id === user.id
      );

      const orgId = member?.organization_id || "";

      if (typeof window !== "undefined") {
        localStorage.setItem(
          "elmo_session",
          JSON.stringify({
            userId: user.id,
            email: user.email,
            displayName: profile?.display_name || "User",
            activeOrganizationId: orgId,
          })
        );
      }

      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: profile?.display_name || "User",
          },
          organizationId: orgId,
        },
        error: null,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unexpected error during login.";
      return { data: null, error: message };
    }
  }

  /**
   * Log out active user and invalidate session
   */
  public async signOut(): Promise<AuthResponse<boolean>> {
    try {
      if (isSupabaseConfigured()) {
        const supabase = createBrowserSupabase();
        await supabase.auth.signOut();
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("elmo_session");
      }

      return { data: true, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error signing out.";
      return { data: null, error: message };
    }
  }

  /**
   * Get active user session
   */
  public async getSession(): Promise<UserSession> {
    if (isSupabaseConfigured()) {
      const supabase = createBrowserSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { user: null, profile: null, activeOrganizationId: null };
      }

      const { data: profile } = await (supabase.from("profiles") as any)
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      const { data: member } = await (supabase.from("organization_members") as any)
        .select("organization_id")
        .eq("user_id", session.user.id)
        .limit(1)
        .single();

      return {
        user: {
          id: session.user.id,
          email: session.user.email || "",
          displayName: (profile as any)?.display_name || session.user.user_metadata?.display_name || "Executive",
        },
        profile: (profile as Profile) || null,
        activeOrganizationId: (member as any)?.organization_id || null,
      };
    }

    // Mock Mode Session
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("elmo_session");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const profile = this.mockStore.profiles.get(parsed.userId) || null;
          return {
            user: {
              id: parsed.userId,
              email: parsed.email,
              displayName: parsed.displayName,
            },
            profile,
            activeOrganizationId: parsed.activeOrganizationId,
          };
        } catch {
          // fallback
        }
      }
    }

    // Default seeded executive session for developer ease
    const defaultUserId = "00000000-0000-0000-0000-000000000001";
    const user = this.mockStore.users.get(defaultUserId);
    const profile = this.mockStore.profiles.get(defaultUserId);

    return {
      user: user
        ? {
            id: user.id,
            email: user.email,
            displayName: profile?.display_name || "Executive Superior",
          }
        : null,
      profile: profile || null,
      activeOrganizationId: "11111111-1111-1111-1111-111111111111",
    };
  }
}
