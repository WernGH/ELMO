-- ==============================================================================
-- ELMO PHASE 3 — GOALS, TASKS, ACTIVITIES, AND APPROVALS SCHEMA
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    metric TEXT,
    target NUMERIC,
    current_value NUMERIC DEFAULT 0,
    deadline TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BEHIND', 'CANCELLED')),
    related_execution_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_org ON public.goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_select_org_members" ON public.goals;
CREATE POLICY "goals_select_org_members" ON public.goals
    FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "goals_insert_org_members" ON public.goals;
CREATE POLICY "goals_insert_org_members" ON public.goals
    FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "goals_update_org_members" ON public.goals;
CREATE POLICY "goals_update_org_members" ON public.goals
    FOR UPDATE USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "goals_delete_org_members" ON public.goals;
CREATE POLICY "goals_delete_org_members" ON public.goals
    FOR DELETE USING (public.is_org_member(organization_id));

-- 2. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    execution_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    owner_type TEXT NOT NULL DEFAULT 'AI' CHECK (owner_type IN ('AI', 'HUMAN')),
    owner_name TEXT NOT NULL DEFAULT 'ELMO',
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    due_date TIMESTAMPTZ,
    result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal ON public.tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_org_members" ON public.tasks;
CREATE POLICY "tasks_select_org_members" ON public.tasks
    FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "tasks_insert_org_members" ON public.tasks;
CREATE POLICY "tasks_insert_org_members" ON public.tasks
    FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "tasks_update_org_members" ON public.tasks;
CREATE POLICY "tasks_update_org_members" ON public.tasks
    FOR UPDATE USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "tasks_delete_org_members" ON public.tasks;
CREATE POLICY "tasks_delete_org_members" ON public.tasks
    FOR DELETE USING (public.is_org_member(organization_id));

-- 3. Activities Table (Timeline)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_type TEXT NOT NULL DEFAULT 'AI' CHECK (actor_type IN ('AI', 'HUMAN', 'SYSTEM', 'VISITOR')),
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_org ON public.activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.activities(created_at DESC);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_select_org_members" ON public.activities;
CREATE POLICY "activities_select_org_members" ON public.activities
    FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "activities_insert_org_members" ON public.activities;
CREATE POLICY "activities_insert_org_members" ON public.activities
    FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "activities_delete_org_members" ON public.activities;
CREATE POLICY "activities_delete_org_members" ON public.activities
    FOR DELETE USING (public.is_org_member(organization_id));

-- 4. Approvals Table
CREATE TABLE IF NOT EXISTS public.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    execution_id TEXT,
    step_id TEXT,
    action TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    category TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
    details TEXT,
    proposed_changes JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'modified')),
    decision_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    decision_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    decided_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_approvals_org ON public.approvals(organization_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(status);

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approvals_select_org_members" ON public.approvals;
CREATE POLICY "approvals_select_org_members" ON public.approvals
    FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "approvals_insert_org_members" ON public.approvals;
CREATE POLICY "approvals_insert_org_members" ON public.approvals
    FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "approvals_update_org_members" ON public.approvals;
CREATE POLICY "approvals_update_org_members" ON public.approvals
    FOR UPDATE USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "approvals_delete_org_members" ON public.approvals;
CREATE POLICY "approvals_delete_org_members" ON public.approvals
    FOR DELETE USING (public.is_org_member(organization_id));
