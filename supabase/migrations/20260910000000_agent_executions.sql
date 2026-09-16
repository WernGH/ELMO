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
