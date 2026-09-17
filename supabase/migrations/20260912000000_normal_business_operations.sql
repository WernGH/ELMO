-- ==============================================================================
-- ELMO BUSINESS OPERATIONS SUITE SCHEMA
-- Quotes, Bookings, Review Requests, and Standard Operating Procedures (SOPs)
-- PostgreSQL / Supabase Migration
-- ==============================================================================

-- 1. Quotes Table
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    quote_number TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'paid', 'overdue')),
    issue_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_date TIMESTAMPTZ,
    currency TEXT NOT NULL DEFAULT 'USD',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_rate NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    payment_terms TEXT NOT NULL DEFAULT 'Net 14',
    payment_instructions TEXT,
    notes TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_org ON public.quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes(quote_number);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotes_select_org_members" ON public.quotes;
CREATE POLICY "quotes_select_org_members" ON public.quotes
    FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "quotes_insert_org_members" ON public.quotes;
CREATE POLICY "quotes_insert_org_members" ON public.quotes
    FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "quotes_update_org_members" ON public.quotes;
CREATE POLICY "quotes_update_org_members" ON public.quotes
    FOR UPDATE USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "quotes_delete_org_members" ON public.quotes;
CREATE POLICY "quotes_delete_org_members" ON public.quotes
    FOR DELETE USING (public.is_org_member(organization_id));

-- Public read & accept policy for client-facing quote links
DROP POLICY IF EXISTS "quotes_public_client_read" ON public.quotes;
CREATE POLICY "quotes_public_client_read" ON public.quotes
    FOR SELECT USING (true);


-- 2. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_phone TEXT,
    service_name TEXT NOT NULL,
    booking_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show')),
    reminder_24h_sent BOOLEAN NOT NULL DEFAULT false,
    reminder_2h_sent BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_org ON public.bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time ON public.bookings(booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_select_org_members" ON public.bookings;
CREATE POLICY "bookings_select_org_members" ON public.bookings
    FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "bookings_insert_org_members" ON public.bookings;
CREATE POLICY "bookings_insert_org_members" ON public.bookings
    FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "bookings_update_org_members" ON public.bookings;
CREATE POLICY "bookings_update_org_members" ON public.bookings
    FOR UPDATE USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "bookings_delete_org_members" ON public.bookings;
CREATE POLICY "bookings_delete_org_members" ON public.bookings
    FOR DELETE USING (public.is_org_member(organization_id));


-- 3. Review Requests Table
CREATE TABLE IF NOT EXISTS public.review_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone_or_email TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'rated_positive', 'intercepted_negative')),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    private_feedback TEXT,
    google_review_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_org ON public.review_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.review_requests(status);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_org_members" ON public.review_requests;
CREATE POLICY "reviews_select_org_members" ON public.review_requests
    FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "reviews_insert_org_members" ON public.review_requests;
CREATE POLICY "reviews_insert_org_members" ON public.review_requests
    FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "reviews_update_org_members" ON public.review_requests;
CREATE POLICY "reviews_update_org_members" ON public.review_requests
    FOR UPDATE USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "reviews_delete_org_members" ON public.review_requests;
CREATE POLICY "reviews_delete_org_members" ON public.review_requests
    FOR DELETE USING (public.is_org_member(organization_id));

-- Public read & feedback submission policy for customer-facing rating link
DROP POLICY IF EXISTS "reviews_public_client_read" ON public.review_requests;
CREATE POLICY "reviews_public_client_read" ON public.review_requests
    FOR SELECT USING (true);


-- 4. Standard Operating Procedures (SOPs) Table
CREATE TABLE IF NOT EXISTS public.sops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'operations' CHECK (category IN ('operations', 'customer_service', 'finance', 'safety', 'onboarding')),
    content TEXT NOT NULL,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sops_org ON public.sops(organization_id);
CREATE INDEX IF NOT EXISTS idx_sops_category ON public.sops(category);

ALTER TABLE public.sops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sops_select_org_members" ON public.sops;
CREATE POLICY "sops_select_org_members" ON public.sops
    FOR SELECT USING (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "sops_insert_org_members" ON public.sops;
CREATE POLICY "sops_insert_org_members" ON public.sops
    FOR INSERT WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "sops_update_org_members" ON public.sops;
CREATE POLICY "sops_update_org_members" ON public.sops
    FOR UPDATE USING (public.is_org_member(organization_id)) WITH CHECK (public.is_org_member(organization_id));

DROP POLICY IF EXISTS "sops_delete_org_members" ON public.sops;
CREATE POLICY "sops_delete_org_members" ON public.sops
    FOR DELETE USING (public.is_org_member(organization_id));
