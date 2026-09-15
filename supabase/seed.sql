-- ==============================================================================
-- ELMO Phase 1 Seed Data
-- ==============================================================================

-- Sample organization
INSERT INTO public.organizations (id, name, slug, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Acme AI Dynamics',
    'acme-ai-dynamics',
    '{"theme": "dark", "elmo_status": "active", "autonomy_level": "supervised"}'::jsonb
) ON CONFLICT (id) DO NOTHING;
