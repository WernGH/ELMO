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
CREATE TRIGGER set_voice_sessions_updated_at
    BEFORE UPDATE ON public.voice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 2. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;

-- SELECT: Members of an organization can read voice sessions
CREATE POLICY "voice_sessions_select_org_members"
    ON public.voice_sessions
    FOR SELECT
    USING (public.is_org_member(organization_id));

-- INSERT: Members of an organization can create voice sessions
CREATE POLICY "voice_sessions_insert_org_members"
    ON public.voice_sessions
    FOR INSERT
    WITH CHECK (public.is_org_member(organization_id));

-- UPDATE: Members of an organization can update voice sessions
CREATE POLICY "voice_sessions_update_org_members"
    ON public.voice_sessions
    FOR UPDATE
    USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- DELETE: Members of an organization can delete voice sessions
CREATE POLICY "voice_sessions_delete_org_members"
    ON public.voice_sessions
    FOR DELETE
    USING (public.is_org_member(organization_id));
