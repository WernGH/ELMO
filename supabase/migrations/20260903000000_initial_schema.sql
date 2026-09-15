-- ==============================================================================
-- ELMO PHASE 1 — COMPANY FOUNDATION DATABASE SCHEMA
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by slug
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- 3. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 4. Organization Members Table
-- Supported Roles: owner, admin, manager, member, viewer
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_organization_member UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);

-- ==============================================================================
-- 5. Helper Functions & Triggers
-- ==============================================================================

-- Timestamp auto-updater
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Security Definer: Check if calling user is member of an organization
CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_members
        WHERE organization_id = target_org_id
          AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security Definer: Get role of calling user in an organization
CREATE OR REPLACE FUNCTION public.get_org_role(target_org_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.organization_members
    WHERE organization_id = target_org_id
      AND user_id = auth.uid();
    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Automatically create profile upon user signup in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to auth.users if auth schema exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END $$;

-- ==============================================================================
-- 6. Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- ORGANIZATIONS POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Users can only see organizations they belong to
CREATE POLICY "org_select_members_only"
    ON public.organizations
    FOR SELECT
    USING (public.is_org_member(id));

-- INSERT: Authenticated users can create new organizations
CREATE POLICY "org_insert_authenticated"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only 'owner' or 'admin' can update organization settings/name
CREATE POLICY "org_update_owner_admin_only"
    ON public.organizations
    FOR UPDATE
    USING (public.get_org_role(id) IN ('owner', 'admin'))
    WITH CHECK (public.get_org_role(id) IN ('owner', 'admin'));

-- DELETE: Only 'owner' can delete the organization
CREATE POLICY "org_delete_owner_only"
    ON public.organizations
    FOR DELETE
    USING (public.get_org_role(id) = 'owner');

-- ------------------------------------------------------------------------------
-- ORGANIZATION MEMBERS POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Members of an organization can view its roster
CREATE POLICY "org_members_select_peer_members"
    ON public.organization_members
    FOR SELECT
    USING (public.is_org_member(organization_id));

-- INSERT: Allowed if:
-- 1. Caller is 'owner' or 'admin' in this organization, OR
-- 2. Organization has no members yet and caller is adding themselves (initial organization setup)
CREATE POLICY "org_members_insert_authorized"
    ON public.organization_members
    FOR INSERT
    WITH CHECK (
        (public.get_org_role(organization_id) IN ('owner', 'admin'))
        OR
        (
            NOT EXISTS (
                SELECT 1 FROM public.organization_members om
                WHERE om.organization_id = organization_id
            )
            AND user_id = auth.uid()
        )
    );

-- UPDATE: Only 'owner' or 'admin' can modify member roles
CREATE POLICY "org_members_update_owner_admin_only"
    ON public.organization_members
    FOR UPDATE
    USING (public.get_org_role(organization_id) IN ('owner', 'admin'))
    WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- DELETE: Owner/Admin can remove members, or members can remove themselves (leave org)
CREATE POLICY "org_members_delete_authorized"
    ON public.organization_members
    FOR DELETE
    USING (
        public.get_org_role(organization_id) IN ('owner', 'admin')
        OR user_id = auth.uid()
    );

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Users can read their own profile, or profiles of members sharing an organization
CREATE POLICY "profiles_select_shared_org_or_self"
    ON public.profiles
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.organization_members my_orgs
            JOIN public.organization_members their_orgs
              ON my_orgs.organization_id = their_orgs.organization_id
            WHERE my_orgs.user_id = auth.uid()
              AND their_orgs.user_id = profiles.user_id
        )
    );

-- INSERT: Users can only insert their own profile
CREATE POLICY "profiles_insert_own_only"
    ON public.profiles
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own profile
CREATE POLICY "profiles_update_own_only"
    ON public.profiles
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
