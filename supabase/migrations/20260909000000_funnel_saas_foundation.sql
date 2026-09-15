-- ==============================================================================
-- ELMO PHASE 1 — INTELLIGENT SAAS + FUNNEL FOUNDATION DATABASE SCHEMA
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. Funnels Table
CREATE TABLE IF NOT EXISTS public.funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    goal TEXT,
    funnel_type TEXT NOT NULL DEFAULT 'Lead Generation',
    target_audience TEXT,
    offer TEXT,
    primary_conversion_goal TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    business_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnels_org ON public.funnels(organization_id);
CREATE INDEX IF NOT EXISTS idx_funnels_status ON public.funnels(status);

CREATE TRIGGER set_funnels_updated_at
    BEFORE UPDATE ON public.funnels
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 2. Pages Table
CREATE TABLE IF NOT EXISTS public.pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    page_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    title TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pages_org ON public.pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_pages_funnel ON public.pages(funnel_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);

CREATE TRIGGER set_pages_updated_at
    BEFORE UPDATE ON public.pages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 3. Funnel Steps Table
CREATE TABLE IF NOT EXISTS public.funnel_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 1,
    step_type TEXT NOT NULL,
    name TEXT NOT NULL,
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    goal TEXT,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel ON public.funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_steps_order ON public.funnel_steps(funnel_id, step_order);

CREATE TRIGGER set_funnel_steps_updated_at
    BEFORE UPDATE ON public.funnel_steps
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 4. Page Sections Table (Structured Page Components)
CREATE TABLE IF NOT EXISTS public.page_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    section_type TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 1,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    layout JSONB NOT NULL DEFAULT '{}'::jsonb,
    styles JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_sections_page ON public.page_sections(page_id);
CREATE INDEX IF NOT EXISTS idx_page_sections_order ON public.page_sections(page_id, order_index);

CREATE TRIGGER set_page_sections_updated_at
    BEFORE UPDATE ON public.page_sections
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 5. Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'customer', 'subscriber', 'unsubscribed', 'archived')),
    source TEXT,
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(organization_id, email);

CREATE TRIGGER set_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 6. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tags_org ON public.tags(organization_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tags_org_name ON public.tags(organization_id, name);

-- 7. Contact Tags Table (Join Table)
CREATE TABLE IF NOT EXISTS public.contact_tags (
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (contact_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON public.contact_tags(tag_id);

-- 8. Contact Events Table
CREATE TABLE IF NOT EXISTS public.contact_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_events_org ON public.contact_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_events_contact ON public.contact_events(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_events_type ON public.contact_events(event_type);

-- 9. Forms Table
CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    submit_action JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forms_org ON public.forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_forms_page ON public.forms(page_id);

CREATE TRIGGER set_forms_updated_at
    BEFORE UPDATE ON public.forms
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 10. Form Submissions Table
CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_org ON public.form_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form ON public.form_submissions(form_id);

-- 11. Email Templates Table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_org ON public.email_templates(organization_id);

CREATE TRIGGER set_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 12. Email Sequences Table
CREATE TABLE IF NOT EXISTS public.email_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sequences_org ON public.email_sequences(organization_id);

CREATE TRIGGER set_email_sequences_updated_at
    BEFORE UPDATE ON public.email_sequences
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 13. Email Sequence Steps Table
CREATE TABLE IF NOT EXISTS public.email_sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES public.email_sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL DEFAULT 1,
    delay_value INTEGER NOT NULL DEFAULT 0,
    delay_unit TEXT NOT NULL DEFAULT 'hours' CHECK (delay_unit IN ('minutes', 'hours', 'days', 'weeks')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_seq_steps_seq ON public.email_sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_email_seq_steps_order ON public.email_sequence_steps(sequence_id, step_order);

CREATE TRIGGER set_email_sequence_steps_updated_at
    BEFORE UPDATE ON public.email_sequence_steps
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 14. Automations Table
CREATE TABLE IF NOT EXISTS public.automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automations_org ON public.automations(organization_id);

CREATE TRIGGER set_automations_updated_at
    BEFORE UPDATE ON public.automations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- 15. Automation Triggers Table
CREATE TABLE IF NOT EXISTS public.automation_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_triggers_auto ON public.automation_triggers(automation_id);

-- 16. Automation Conditions Table
CREATE TABLE IF NOT EXISTS public.automation_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
    condition_type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    step_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_conditions_auto ON public.automation_conditions(automation_id);

-- 17. Automation Actions Table
CREATE TABLE IF NOT EXISTS public.automation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    step_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_actions_auto ON public.automation_actions(automation_id);

-- 18. Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
    page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_org ON public.analytics_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_funnel ON public.analytics_events(funnel_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at DESC);

-- ==============================================================================
-- 19. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Funnels Policies
CREATE POLICY "funnels_tenant_isolation" ON public.funnels
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Pages Policies
CREATE POLICY "pages_tenant_isolation" ON public.pages
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Funnel Steps Policies
CREATE POLICY "funnel_steps_tenant_isolation" ON public.funnel_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.funnels f
            WHERE f.id = funnel_steps.funnel_id
              AND public.is_org_member(f.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.funnels f
            WHERE f.id = funnel_steps.funnel_id
              AND public.is_org_member(f.organization_id)
        )
    );

-- Page Sections Policies
CREATE POLICY "page_sections_tenant_isolation" ON public.page_sections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pages p
            WHERE p.id = page_sections.page_id
              AND public.is_org_member(p.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pages p
            WHERE p.id = page_sections.page_id
              AND public.is_org_member(p.organization_id)
        )
    );

-- Contacts Policies
CREATE POLICY "contacts_tenant_isolation" ON public.contacts
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Tags Policies
CREATE POLICY "tags_tenant_isolation" ON public.tags
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Contact Tags Policies
CREATE POLICY "contact_tags_tenant_isolation" ON public.contact_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.contacts c
            WHERE c.id = contact_tags.contact_id
              AND public.is_org_member(c.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contacts c
            WHERE c.id = contact_tags.contact_id
              AND public.is_org_member(c.organization_id)
        )
    );

-- Contact Events Policies
CREATE POLICY "contact_events_tenant_isolation" ON public.contact_events
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Forms Policies
CREATE POLICY "forms_tenant_isolation" ON public.forms
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Form Submissions Policies
CREATE POLICY "form_submissions_tenant_isolation" ON public.form_submissions
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Email Templates Policies
CREATE POLICY "email_templates_tenant_isolation" ON public.email_templates
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Email Sequences Policies
CREATE POLICY "email_sequences_tenant_isolation" ON public.email_sequences
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Email Sequence Steps Policies
CREATE POLICY "email_sequence_steps_tenant_isolation" ON public.email_sequence_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.email_sequences es
            WHERE es.id = email_sequence_steps.sequence_id
              AND public.is_org_member(es.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.email_sequences es
            WHERE es.id = email_sequence_steps.sequence_id
              AND public.is_org_member(es.organization_id)
        )
    );

-- Automations Policies
CREATE POLICY "automations_tenant_isolation" ON public.automations
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));

-- Automation Triggers Policies
CREATE POLICY "automation_triggers_tenant_isolation" ON public.automation_triggers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_triggers.automation_id
              AND public.is_org_member(a.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_triggers.automation_id
              AND public.is_org_member(a.organization_id)
        )
    );

-- Automation Conditions Policies
CREATE POLICY "automation_conditions_tenant_isolation" ON public.automation_conditions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_conditions.automation_id
              AND public.is_org_member(a.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_conditions.automation_id
              AND public.is_org_member(a.organization_id)
        )
    );

-- Automation Actions Policies
CREATE POLICY "automation_actions_tenant_isolation" ON public.automation_actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_actions.automation_id
              AND public.is_org_member(a.organization_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.automations a
            WHERE a.id = automation_actions.automation_id
              AND public.is_org_member(a.organization_id)
        )
    );

-- Analytics Events Policies
CREATE POLICY "analytics_events_tenant_isolation" ON public.analytics_events
    FOR ALL USING (public.is_org_member(organization_id))
    WITH CHECK (public.is_org_member(organization_id));
