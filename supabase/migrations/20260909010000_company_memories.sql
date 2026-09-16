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
