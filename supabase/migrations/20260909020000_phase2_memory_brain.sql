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
