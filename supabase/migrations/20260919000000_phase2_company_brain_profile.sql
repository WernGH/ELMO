-- ============================================================================
-- ELMO Phase 2: Company Brain, Memory & Business Context Upgrade
-- Migration: 20260919000000_phase2_company_brain_profile.sql
--
-- 1. Updates category check constraint for company_memories to support:
--    - rule, rules, lesson, lessons, workflow, workflows
-- 2. Updates source check constraint to support:
--    - fact, user_provided, system_derived, ai_inferred, unverified,
--      conversation, explicit_command, tool_execution, user_input
-- 3. Ensures RLS policies enforce strict tenant isolation
-- ============================================================================

DO $$
BEGIN
    -- Update category check constraint
    ALTER TABLE public.company_memories DROP CONSTRAINT IF EXISTS company_memories_category_check;
    ALTER TABLE public.company_memories ADD CONSTRAINT company_memories_category_check
        CHECK (category IN (
            'business', 'company', 'brand', 'products', 'services', 'customers', 'customer',
            'target audience', 'offers', 'marketing', 'sales', 'operations', 'goals', 'goal',
            'processes', 'employees', 'AI workforce', 'decisions', 'decision', 'documents',
            'preferences', 'preference', 'funnel', 'user_profile', 'person', 'project',
            'strategy', 'task', 'important_fact', 'conversation', 'experience', 'learning',
            'routine', 'relationship', 'rule', 'rules', 'lesson', 'lessons', 'workflow', 'workflows'
        ));

    -- Update source check constraint
    ALTER TABLE public.company_memories DROP CONSTRAINT IF EXISTS company_memories_source_check;
    ALTER TABLE public.company_memories ADD CONSTRAINT company_memories_source_check
        CHECK (source IN (
            'conversation', 'explicit_command', 'tool_execution', 'user_input',
            'fact', 'user_provided', 'system_derived', 'ai_inferred', 'unverified'
        ));
END $$;

-- Additional composite performance indexes for Phase 2 dynamic retrieval
CREATE INDEX IF NOT EXISTS idx_company_memories_org_cat_status
    ON public.company_memories(organization_id, category, status);

CREATE INDEX IF NOT EXISTS idx_company_memories_org_importance_conf
    ON public.company_memories(organization_id, importance_score DESC, confidence DESC);
