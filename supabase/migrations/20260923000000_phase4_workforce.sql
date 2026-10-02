-- ============================================================================
-- ELMO Phase 4: AI Workforce & Multi-Agent Operating System Schema Migration
-- ============================================================================

-- 1. AI Workers Table
CREATE TABLE IF NOT EXISTS public.ai_workers (
    id TEXT PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    role TEXT NOT NULL,
    capabilities TEXT[] DEFAULT '{}',
    skills TEXT[] DEFAULT '{}',
    allowed_tools TEXT[] DEFAULT '{}',
    permissions TEXT[] DEFAULT '{}',
    system_instructions TEXT,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    availability NUMERIC(3, 2) DEFAULT 1.0,
    workload INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 5,
    version TEXT NOT NULL DEFAULT '1.0.0',
    priority INTEGER DEFAULT 80,
    worker_type TEXT NOT NULL DEFAULT 'foundational',
    source TEXT NOT NULL DEFAULT 'builtin',
    enabled BOOLEAN NOT NULL DEFAULT true,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Worker Assignments Table
CREATE TABLE IF NOT EXISTS public.worker_assignments (
    id TEXT PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    worker_id TEXT NOT NULL REFERENCES public.ai_workers(id) ON DELETE CASCADE,
    task_id TEXT NOT NULL,
    execution_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 3. Worker Handoffs Table
CREATE TABLE IF NOT EXISTS public.worker_handoffs (
    id TEXT PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    execution_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    from_worker_id TEXT NOT NULL,
    to_worker_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    objective TEXT NOT NULL,
    completed_work TEXT NOT NULL,
    required_next_action TEXT NOT NULL,
    inputs JSONB DEFAULT '{}'::jsonb,
    outputs JSONB DEFAULT '{}'::jsonb,
    verification_status TEXT NOT NULL DEFAULT 'PASSED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Worker Activity Telemetry Table
CREATE TABLE IF NOT EXISTS public.worker_activity (
    id TEXT PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    execution_id TEXT NOT NULL,
    task_id TEXT,
    worker_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performant lookup
CREATE INDEX IF NOT EXISTS idx_ai_workers_org ON public.ai_workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_assignments_org ON public.worker_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_handoffs_exec ON public.worker_handoffs(execution_id);
CREATE INDEX IF NOT EXISTS idx_worker_activity_org ON public.worker_activity(organization_id);

-- Enable Row Level Security
ALTER TABLE public.ai_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Multi-tenant isolation
CREATE POLICY "Users can view workers in their organization or global builtin"
    ON public.ai_workers FOR SELECT
    USING (organization_id IS NULL OR organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view worker assignments in their organization"
    ON public.worker_assignments FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view worker handoffs in their organization"
    ON public.worker_handoffs FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view worker activity in their organization"
    ON public.worker_activity FOR SELECT
    USING (organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    ));
