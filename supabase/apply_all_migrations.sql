-- ==============================================================================
-- ELMO COMPLETE SUPABASE SCHEMA & MIGRATIONS (CHRONOLOGICAL ROLLUP)
-- Run this in Supabase SQL Editor to provision all tables, RLS policies, & indexes
-- ==============================================================================

-- >>> MIGRATION: 20260903000000_initial_schema.sql <<<
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

DROP TRIGGER IF EXISTS set_organizations_updated_at ON public.organizations;
CREATE TRIGGER set_organizations_updated_at BEFORE UPDATE ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
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
DROP POLICY IF EXISTS "org_select_members_only" ON public.organizations;
CREATE POLICY "org_select_members_only" ON public.organizations
    FOR SELECT
    USING (public.is_org_member(id));

-- INSERT: Authenticated users can create new organizations
DROP POLICY IF EXISTS "org_insert_authenticated" ON public.organizations;
CREATE POLICY "org_insert_authenticated" ON public.organizations
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only 'owner' or 'admin' can update organization settings/name
DROP POLICY IF EXISTS "org_update_owner_admin_only" ON public.organizations;
CREATE POLICY "org_update_owner_admin_only" ON public.organizations
    FOR UPDATE
    USING (public.get_org_role(id) IN ('owner', 'admin'))
    WITH CHECK (public.get_org_role(id) IN ('owner', 'admin'));

-- DELETE: Only 'owner' can delete the organization
DROP POLICY IF EXISTS "org_delete_owner_only" ON public.organizations;
CREATE POLICY "org_delete_owner_only" ON public.organizations
    FOR DELETE
    USING (public.get_org_role(id) = 'owner');

-- ------------------------------------------------------------------------------
-- ORGANIZATION MEMBERS POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Members of an organization can view its roster
DROP POLICY IF EXISTS "org_members_select_peer_members" ON public.organization_members;
CREATE POLICY "org_members_select_peer_members" ON public.organization_members
    FOR SELECT
    USING (public.is_org_member(organization_id));

-- INSERT: Allowed if:
-- 1. Caller is 'owner' or 'admin' in this organization, OR
-- 2. Organization has no members yet and caller is adding themselves (initial organization setup)
DROP POLICY IF EXISTS "org_members_insert_authorized" ON public.organization_members;
CREATE POLICY "org_members_insert_authorized" ON public.organization_members
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
DROP POLICY IF EXISTS "org_members_update_owner_admin_only" ON public.organization_members;
CREATE POLICY "org_members_update_owner_admin_only" ON public.organization_members
    FOR UPDATE
    USING (public.get_org_role(organization_id) IN ('owner', 'admin'))
    WITH CHECK (public.get_org_role(organization_id) IN ('owner', 'admin'));

-- DELETE: Owner/Admin can remove members, or members can remove themselves (leave org)
DROP POLICY IF EXISTS "org_members_delete_authorized" ON public.organization_members;
CREATE POLICY "org_members_delete_authorized" ON public.organization_members
    FOR DELETE
    USING (
        public.get_org_role(organization_id) IN ('owner', 'admin')
        OR user_id = auth.uid()
    );

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Users can read their own profile, or profiles of members sharing an organization
DROP POLICY IF EXISTS "profiles_select_shared_org_or_self" ON public.profiles;
CREATE POLICY "profiles_select_shared_org_or_self" ON public.profiles
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
DROP POLICY IF EXISTS "profiles_insert_own_only" ON public.profiles;
CREATE POLICY "profiles_insert_own_only" ON public.profiles
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can only update their own profile
DROP POLICY IF EXISTS "profiles_update_own_only" ON public.profiles;
CREATE POLICY "profiles_update_own_only" ON public.profiles
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- >>> MIGRATION: 20260905000000_conversations_and_messages.sql <<<
-- ==============================================================================
-- ELMO PHASE 2 — AI CEO BRAIN: CONVERSATIONS & MESSAGES SCHEMA
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Executive Session',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- Trigger: auto-update conversation timestamp
DROP TRIGGER IF EXISTS set_conversations_updated_at ON public.conversations;
CREATE TRIGGER set_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_org ON public.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);

-- ==============================================================================
-- 3. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- CONVERSATIONS POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Members of an organization can read its conversations
DROP POLICY IF EXISTS "conversations_select_org_members" ON public.conversations;
CREATE POLICY "conversations_select_org_members" ON public.conversations
    FOR SELECT
    USING (public.is_org_member(organization_id));

-- INSERT: Members of an organization can create conversations
DROP POLICY IF EXISTS "conversations_insert_org_members" ON public.conversations;
CREATE POLICY "conversations_insert_org_members" ON public.conversations
    FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- UPDATE: Members of an organization can update conversation titles
DROP POLICY IF EXISTS "conversations_update_org_members" ON public.conversations;
CREATE POLICY "conversations_update_org_members" ON public.conversations
    FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- DELETE: Members of an organization can delete conversations
DROP POLICY IF EXISTS "conversations_delete_org_members" ON public.conversations;
CREATE POLICY "conversations_delete_org_members" ON public.conversations
    FOR DELETE
    USING (public.is_org_member(organization_id));

-- ------------------------------------------------------------------------------
-- MESSAGES POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Members of an organization can read messages in their org
DROP POLICY IF EXISTS "messages_select_org_members" ON public.messages;
CREATE POLICY "messages_select_org_members" ON public.messages
    FOR SELECT
    USING (public.is_org_member(organization_id));

-- INSERT: Members of an organization can insert messages
DROP POLICY IF EXISTS "messages_insert_org_members" ON public.messages;
CREATE POLICY "messages_insert_org_members" ON public.messages
    FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- DELETE: Members of an organization can delete messages
DROP POLICY IF EXISTS "messages_delete_org_members" ON public.messages;
CREATE POLICY "messages_delete_org_members" ON public.messages
    FOR DELETE
    USING (public.is_org_member(organization_id));


-- >>> MIGRATION: 20260907000000_voice_sessions.sql <<<
-- ==============================================================================
-- ELMO PHASE 3 — REALTIME VOICE & MULTILINGUAL SESSIONS SCHEMA
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. Voice Sessions Table (Tracks session metadata only; ZERO raw audio stored)
CREATE TABLE IF NOT EXISTS public.voice_sessions (
    id TEXT PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    detected_language VARCHAR(32) NOT NULL DEFAULT 'auto',
    user_turns_count INTEGER NOT NULL DEFAULT 0,
    assistant_turns_count INTEGER NOT NULL DEFAULT 0,
    interruption_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'interrupted', 'failed')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_org ON public.voice_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON public.voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_created_at ON public.voice_sessions(created_at DESC);

-- Trigger: auto-update timestamp
DROP TRIGGER IF EXISTS set_voice_sessions_updated_at ON public.voice_sessions;
CREATE TRIGGER set_voice_sessions_updated_at BEFORE UPDATE ON public.voice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 2. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- SELECT: Members of an organization can read voice sessions
DROP POLICY IF EXISTS "voice_sessions_select_org_members" ON public.voice_sessions;
CREATE POLICY "voice_sessions_select_org_members" ON public.voice_sessions
    FOR SELECT
    USING (public.is_org_member(organization_id));

-- INSERT: Members of an organization can create voice sessions
DROP POLICY IF EXISTS "voice_sessions_insert_org_members" ON public.voice_sessions;
CREATE POLICY "voice_sessions_insert_org_members" ON public.voice_sessions
    FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- UPDATE: Members of an organization can update voice sessions
DROP POLICY IF EXISTS "voice_sessions_update_org_members" ON public.voice_sessions;
CREATE POLICY "voice_sessions_update_org_members" ON public.voice_sessions
    FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- DELETE: Members of an organization can delete voice sessions
DROP POLICY IF EXISTS "voice_sessions_delete_org_members" ON public.voice_sessions;
CREATE POLICY "voice_sessions_delete_org_members" ON public.voice_sessions
    FOR DELETE
    USING (public.is_org_member(organization_id));


-- >>> MIGRATION: 20260909000000_funnel_saas_foundation.sql <<<
-- ==============================================================================
-- ELMO PHASE 1 — INTELLIGENT SAAS + FUNNEL FOUNDATION DATABASE SCHEMA
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. Funnels Table
CREATE TABLE IF NOT EXISTS public.funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    funnel_type TEXT NOT NULL DEFAULT 'Lead Generation',
    target_audience TEXT,
    offer TEXT,
    primary_conversion_goal TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    business_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnels_org ON public.funnels(organization_id);
CREATE INDEX IF NOT EXISTS idx_funnels_status ON public.funnels(status);

DROP TRIGGER IF EXISTS set_funnels_updated_at ON public.funnels;
CREATE TRIGGER set_funnels_updated_at BEFORE UPDATE ON public.funnels
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Pages Table
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    page_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    title TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pages_org ON public.pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_pages_funnel ON public.pages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);

DROP TRIGGER IF EXISTS set_pages_updated_at ON public.pages;
CREATE TRIGGER set_pages_updated_at BEFORE UPDATE ON public.pages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 3. Funnel Steps Table
CREATE TABLE IF NOT EXISTS public.funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 1,
    step_type TEXT NOT NULL,
    name TEXT NOT NULL,
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    goal TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel ON public.funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_steps_order ON public.funnel_steps(funnel_id, step_order);

DROP TRIGGER IF EXISTS set_funnel_steps_updated_at ON public.funnel_steps;
CREATE TRIGGER set_funnel_steps_updated_at BEFORE UPDATE ON public.funnel_steps
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 4. Page Sections Table (Structured Page Components)
CREATE TABLE IF NOT EXISTS public.page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    layout JSONB NOT NULL DEFAULT '{}'::jsonb,
    styles JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_sections_page ON public.page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_order ON public.page_sections(page_id, order_index);

DROP TRIGGER IF EXISTS set_page_sections_updated_at ON public.page_sections;
CREATE TRIGGER set_page_sections_updated_at BEFORE UPDATE ON public.page_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'customer', 'subscriber', 'unsubscribed', 'archived')),
    source TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(organization_id, email);

DROP TRIGGER IF EXISTS set_contacts_updated_at ON public.contacts;
CREATE TRIGGER set_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 6. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tags_org ON public.tags(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_org_name ON public.tags(organization_id, name);

-- 7. Contact Tags Table (Join Table)
CREATE TABLE IF NOT EXISTS public.contact_tags (
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON public.contact_tags(tag_id);

-- 8. Contact Events Table
CREATE TABLE IF NOT EXISTS public.contact_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_events_org ON public.contact_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_events_contact ON public.contact_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_events_type ON public.contact_events(event_type);

-- 9. Forms Table
CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    submit_action JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forms_org ON public.forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_page ON public.forms(page_id);

DROP TRIGGER IF EXISTS set_forms_updated_at ON public.forms;
CREATE TRIGGER set_forms_updated_at BEFORE UPDATE ON public.forms
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 10. Form Submissions Table
CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_org ON public.form_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON public.form_submissions(form_id);

-- 11. Email Templates Table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON public.email_templates(organization_id);

DROP TRIGGER IF EXISTS set_email_templates_updated_at ON public.email_templates;
CREATE TRIGGER set_email_templates_updated_at BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 12. Email Sequences Table
CREATE TABLE IF NOT EXISTS public.email_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sequences_org ON public.email_sequences(organization_id);

DROP TRIGGER IF EXISTS set_email_sequences_updated_at ON public.email_sequences;
CREATE TRIGGER set_email_sequences_updated_at BEFORE UPDATE ON public.email_sequences
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 13. Email Sequence Steps Table
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 1,
    delay_value INTEGER NOT NULL DEFAULT 0,
    delay_unit TEXT NOT NULL DEFAULT 'hours' CHECK (delay_unit IN ('minutes', 'hours', 'days', 'weeks')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_seq_steps_seq ON public.email_sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_seq_steps_order ON public.email_sequence_steps(sequence_id, step_order);

DROP TRIGGER IF EXISTS set_email_sequence_steps_updated_at ON public.email_sequence_steps;
CREATE TRIGGER set_email_sequence_steps_updated_at BEFORE UPDATE ON public.email_sequence_steps
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 14. Automations Table
CREATE TABLE IF NOT EXISTS public.automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_org ON public.automations(organization_id);

DROP TRIGGER IF EXISTS set_automations_updated_at ON public.automations;
CREATE TRIGGER set_automations_updated_at BEFORE UPDATE ON public.automations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 15. Automation Triggers Table
CREATE TABLE IF NOT EXISTS public.automation_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_triggers_auto ON public.automation_triggers(automation_id);

-- 16. Automation Conditions Table
CREATE TABLE IF NOT EXISTS public.automation_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    step_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_conditions_auto ON public.automation_conditions(automation_id);

-- 17. Automation Actions Table
CREATE TABLE IF NOT EXISTS public.automation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    step_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_actions_auto ON public.automation_actions(automation_id);

-- 18. Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_org ON public.analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_funnel ON public.analytics_events(funnel_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at DESC);

-- ==============================================================================
-- 19. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Funnels Policies
DROP POLICY IF EXISTS "funnels_tenant_isolation" ON public.funnels;
CREATE POLICY "funnels_tenant_isolation" ON public.funnels
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Pages Policies
DROP POLICY IF EXISTS "pages_tenant_isolation" ON public.pages;
CREATE POLICY "pages_tenant_isolation" ON public.pages
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Funnel Steps Policies
DROP POLICY IF EXISTS "funnel_steps_tenant_isolation" ON public.funnel_steps;
CREATE POLICY "funnel_steps_tenant_isolation" ON public.funnel_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.funnels f
            WHERE f.id = funnel_steps.funnel_id
              AND public.is_org_member(f.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.funnels f
            WHERE f.id = funnel_steps.funnel_id
              AND public.is_org_member(f.organization_id)
        )
    );

-- Page Sections Policies
DROP POLICY IF EXISTS "page_sections_tenant_isolation" ON public.page_sections;
CREATE POLICY "page_sections_tenant_isolation" ON public.page_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pages p
            WHERE p.id = page_sections.page_id
              AND public.is_org_member(p.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pages p
            WHERE p.id = page_sections.page_id
              AND public.is_org_member(p.organization_id)
        )
    );

-- Contacts Policies
DROP POLICY IF EXISTS "contacts_tenant_isolation" ON public.contacts;
CREATE POLICY "contacts_tenant_isolation" ON public.contacts
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Tags Policies
DROP POLICY IF EXISTS "tags_tenant_isolation" ON public.tags;
CREATE POLICY "tags_tenant_isolation" ON public.tags
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Contact Tags Policies
DROP POLICY IF EXISTS "contact_tags_tenant_isolation" ON public.contact_tags;
CREATE POLICY "contact_tags_tenant_isolation" ON public.contact_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.contacts c
            WHERE c.id = contact_tags.contact_id
              AND public.is_org_member(c.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contacts c
            WHERE c.id = contact_tags.contact_id
              AND public.is_org_member(c.organization_id)
        )
    );

-- Contact Events Policies
DROP POLICY IF EXISTS "contact_events_tenant_isolation" ON public.contact_events;
CREATE POLICY "contact_events_tenant_isolation" ON public.contact_events
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Forms Policies
DROP POLICY IF EXISTS "forms_tenant_isolation" ON public.forms;
CREATE POLICY "forms_tenant_isolation" ON public.forms
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Form Submissions Policies
DROP POLICY IF EXISTS "form_submissions_tenant_isolation" ON public.form_submissions;
CREATE POLICY "form_submissions_tenant_isolation" ON public.form_submissions
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Email Templates Policies
DROP POLICY IF EXISTS "email_templates_tenant_isolation" ON public.email_templates;
CREATE POLICY "email_templates_tenant_isolation" ON public.email_templates
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Email Sequences Policies
DROP POLICY IF EXISTS "email_sequences_tenant_isolation" ON public.email_sequences;
CREATE POLICY "email_sequences_tenant_isolation" ON public.email_sequences
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Email Sequence Steps Policies
DROP POLICY IF EXISTS "email_sequence_steps_tenant_isolation" ON public.email_sequence_steps;
CREATE POLICY "email_sequence_steps_tenant_isolation" ON public.email_sequence_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.email_sequences es
            WHERE es.id = email_sequence_steps.sequence_id
              AND public.is_org_member(es.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.email_sequences es
            WHERE es.id = email_sequence_steps.sequence_id
              AND public.is_org_member(es.organization_id)
        )
    );

-- Automations Policies
DROP POLICY IF EXISTS "automations_tenant_isolation" ON public.automations;
CREATE POLICY "automations_tenant_isolation" ON public.automations
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Automation Triggers Policies
DROP POLICY IF EXISTS "automation_triggers_tenant_isolation" ON public.automation_triggers;
CREATE POLICY "automation_triggers_tenant_isolation" ON public.automation_triggers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_triggers.automation_id
              AND public.is_org_member(a.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_triggers.automation_id
              AND public.is_org_member(a.organization_id)
        )
    );

-- Automation Conditions Policies
DROP POLICY IF EXISTS "automation_conditions_tenant_isolation" ON public.automation_conditions;
CREATE POLICY "automation_conditions_tenant_isolation" ON public.automation_conditions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_conditions.automation_id
              AND public.is_org_member(a.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_conditions.automation_id
              AND public.is_org_member(a.organization_id)
        )
    );

-- Automation Actions Policies
DROP POLICY IF EXISTS "automation_actions_tenant_isolation" ON public.automation_actions;
CREATE POLICY "automation_actions_tenant_isolation" ON public.automation_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_actions.automation_id
              AND public.is_org_member(a.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_actions.automation_id
              AND public.is_org_member(a.organization_id)
        )
    );

-- Analytics Events Policies
DROP POLICY IF EXISTS "analytics_events_tenant_isolation" ON public.analytics_events;
CREATE POLICY "analytics_events_tenant_isolation" ON public.analytics_events
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));


-- >>> MIGRATION: 20260909010000_company_memories.sql <<<
-- ============================================================================
-- ELMO Phase 1+: Company Memory & Organizational Knowledge System
-- Migration: 20260909010000_company_memories.sql
--
-- Provides persistent, semantic, episodic, and business memory with:
-- 1. Multi-tenant organization isolation (RLS)
-- 2. Scope classification: organization, agent_private, task_context
-- 3. Category classification: business, funnel, decision, goal, customer, preference
-- 4. Importance scoring (0.0 to 1.0) and confidence metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.company_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('organization', 'agent_private', 'task_context')) DEFAULT 'organization',
    category TEXT NOT NULL CHECK (category IN ('business', 'funnel', 'decision', 'goal', 'customer', 'preference')) DEFAULT 'business',
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    importance_score NUMERIC(3, 2) NOT NULL DEFAULT 0.50 CHECK (importance_score >= 0.00 AND importance_score <= 1.00),
    confidence NUMERIC(3, 2) NOT NULL DEFAULT 0.90 CHECK (confidence >= 0.00 AND confidence <= 1.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for lightning-fast filtered memory retrieval
CREATE INDEX IF NOT EXISTS idx_company_memories_org_cat ON public.company_memories(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_company_memories_org_importance ON public.company_memories(organization_id, importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_company_memories_scope ON public.company_memories(scope);

-- Row Level Security
ALTER TABLE public.company_memories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can query company memories in their organization" ON public.company_memories;
CREATE POLICY "Users can query company memories in their organization" ON public.company_memories FOR SELECT
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert company memories in their organization" ON public.company_memories;
CREATE POLICY "Users can insert company memories in their organization" ON public.company_memories FOR INSERT
WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update company memories in their organization" ON public.company_memories;
CREATE POLICY "Users can update company memories in their organization" ON public.company_memories FOR UPDATE
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete company memories in their organization" ON public.company_memories;
CREATE POLICY "Users can delete company memories in their organization" ON public.company_memories FOR DELETE
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid()
    )
);


-- >>> MIGRATION: 20260909020000_phase2_memory_brain.sql <<<
-- ============================================================================
-- ELMO Phase 2: Advanced Long-Term Memory & Company Brain
-- Migration: 20260909020000_phase2_memory_brain.sql
--
-- Upgrades company_memories with:
-- 1. Full lifecycle management: active, superseded, archived, expired, deleted
-- 2. Importance scoring (1-5) and calibrated confidence levels (low, medium, high, confirmed)
-- 3. Temporal validity: valid_from, valid_until
-- 4. Supersession tracking: superseded_by foreign key
-- 5. Multilingual normalized search text
-- 6. Entity attribution: entity_type, entity_id, user_id, source, source_reference
-- ============================================================================

-- Add new columns safely if they do not already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='user_id') THEN
        ALTER TABLE public.company_memories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='title') THEN
        ALTER TABLE public.company_memories ADD COLUMN title TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='normalized_content') THEN
        ALTER TABLE public.company_memories ADD COLUMN normalized_content TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='status') THEN
        ALTER TABLE public.company_memories ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'superseded', 'archived', 'expired', 'deleted'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='source') THEN
        ALTER TABLE public.company_memories ADD COLUMN source TEXT NOT NULL DEFAULT 'conversation'
            CHECK (source IN ('conversation', 'explicit_command', 'tool_execution', 'user_input'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='source_reference') THEN
        ALTER TABLE public.company_memories ADD COLUMN source_reference TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='entity_type') THEN
        ALTER TABLE public.company_memories ADD COLUMN entity_type TEXT DEFAULT 'business';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='entity_id') THEN
        ALTER TABLE public.company_memories ADD COLUMN entity_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='valid_from') THEN
        ALTER TABLE public.company_memories ADD COLUMN valid_from TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='valid_until') THEN
        ALTER TABLE public.company_memories ADD COLUMN valid_until TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='superseded_by') THEN
        ALTER TABLE public.company_memories ADD COLUMN superseded_by UUID REFERENCES public.company_memories(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='company_memories' AND column_name='updated_at') THEN
        ALTER TABLE public.company_memories ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Update category check constraint to support all Phase 2 memory categories
ALTER TABLE public.company_memories DROP CONSTRAINT IF EXISTS company_memories_category_check;
ALTER TABLE public.company_memories ADD CONSTRAINT company_memories_category_check
    CHECK (category IN (
        'business', 'funnel', 'decision', 'goal', 'customer', 'preference',
        'user_profile', 'person', 'project', 'strategy', 'task', 'important_fact',
        'conversation', 'experience', 'learning', 'routine', 'relationship'
    ));

-- Indexes for lightning-fast filtered memory retrieval
CREATE INDEX IF NOT EXISTS idx_company_memories_org_status ON public.company_memories(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_company_memories_entity ON public.company_memories(organization_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_company_memories_superseded_by ON public.company_memories(superseded_by);
CREATE INDEX IF NOT EXISTS idx_company_memories_valid_until ON public.company_memories(valid_until);


-- >>> MIGRATION: 20260910000000_agent_executions.sql <<<
-- ==============================================================================
-- ELMO PHASE 3 — AGENT EXECUTION HISTORY SCHEMA
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. Agent Executions Table
CREATE TABLE IF NOT EXISTS public.agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id TEXT NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_id TEXT,
    goal TEXT NOT NULL,
    selected_agents JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PLANNING', 'EXECUTING', 'WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    plan JSONB,
    tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
    results JSONB NOT NULL DEFAULT '[]'::jsonb,
    verification JSONB,
    retries INTEGER NOT NULL DEFAULT 0,
    failures JSONB NOT NULL DEFAULT '[]'::jsonb,
    duration_ms INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_executions_org ON public.agent_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_exec_id ON public.agent_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status ON public.agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_started_at ON public.agent_executions(started_at DESC);

-- ==============================================================================
-- 2. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.agent_executions ENABLE ROW LEVEL SECURITY;

-- SELECT: Members of an organization can view its agent executions
DROP POLICY IF EXISTS "agent_executions_select_org_members" ON public.agent_executions;
CREATE POLICY "agent_executions_select_org_members" ON public.agent_executions
    FOR SELECT
    USING (public.is_org_member(organization_id));

-- INSERT: Members of an organization can record agent executions
DROP POLICY IF EXISTS "agent_executions_insert_org_members" ON public.agent_executions;
CREATE POLICY "agent_executions_insert_org_members" ON public.agent_executions
    FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- UPDATE: Members of an organization can update agent executions
DROP POLICY IF EXISTS "agent_executions_update_org_members" ON public.agent_executions;
CREATE POLICY "agent_executions_update_org_members" ON public.agent_executions
    FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- DELETE: Members of an organization can delete agent executions
DROP POLICY IF EXISTS "agent_executions_delete_org_members" ON public.agent_executions;
CREATE POLICY "agent_executions_delete_org_members" ON public.agent_executions
    FOR DELETE
    USING (public.is_org_member(organization_id));

