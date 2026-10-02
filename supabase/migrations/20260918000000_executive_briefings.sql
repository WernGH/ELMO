-- ============================================================================
-- Migration: 20260918000000_executive_briefings.sql
-- Description: ELMO Executive AI Morning Briefing & Executive Intelligence
-- Enforces strict multi-tenant Row Level Security (RLS) by organization_id
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.executive_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    briefing_date DATE NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    funnel_health JSONB NOT NULL DEFAULT '{}'::jsonb,
    work_status JSONB NOT NULL DEFAULT '{}'::jsonb,
    workforce_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    priority_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    today_focus JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    spoken_briefing TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_org_briefing_date UNIQUE (organization_id, briefing_date)
);

-- Indices for rapid tenant lookups and date filtering
CREATE INDEX IF NOT EXISTS idx_executive_briefings_org_date 
    ON public.executive_briefings(organization_id, briefing_date DESC);
CREATE INDEX IF NOT EXISTS idx_executive_briefings_generated_at 
    ON public.executive_briefings(organization_id, generated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.executive_briefings ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
DROP POLICY IF EXISTS "Members can view their organization briefings" ON public.executive_briefings;
CREATE POLICY "Members can view their organization briefings"
    ON public.executive_briefings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = executive_briefings.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can insert their organization briefings" ON public.executive_briefings;
CREATE POLICY "Members can insert their organization briefings"
    ON public.executive_briefings
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = executive_briefings.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can update their organization briefings" ON public.executive_briefings;
CREATE POLICY "Members can update their organization briefings"
    ON public.executive_briefings
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_members.organization_id = executive_briefings.organization_id
            AND organization_members.user_id = auth.uid()
        )
    );
