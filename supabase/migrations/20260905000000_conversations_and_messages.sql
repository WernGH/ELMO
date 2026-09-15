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
CREATE TRIGGER set_conversations_updated_at
    BEFORE UPDATE ON public.conversations
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
CREATE POLICY "conversations_select_org_members"
    ON public.conversations
    FOR SELECT
    USING (public.is_org_member(organization_id));

-- INSERT: Members of an organization can create conversations
CREATE POLICY "conversations_insert_org_members"
    ON public.conversations
    FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- UPDATE: Members of an organization can update conversation titles
CREATE POLICY "conversations_update_org_members"
    ON public.conversations
    FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- DELETE: Members of an organization can delete conversations
CREATE POLICY "conversations_delete_org_members"
    ON public.conversations
    FOR DELETE
    USING (public.is_org_member(organization_id));

-- ------------------------------------------------------------------------------
-- MESSAGES POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Members of an organization can read messages in their org
CREATE POLICY "messages_select_org_members"
    ON public.messages
    FOR SELECT
    USING (public.is_org_member(organization_id));

-- INSERT: Members of an organization can insert messages
CREATE POLICY "messages_insert_org_members"
    ON public.messages
    FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- DELETE: Members of an organization can delete messages
CREATE POLICY "messages_delete_org_members"
    ON public.messages
    FOR DELETE
    USING (public.is_org_member(organization_id));
