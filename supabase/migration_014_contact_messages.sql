-- MIGRATION 014: Public contact form submissions

CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    message TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Public can insert (the contact form is unauthenticated); only super admins can read/manage.
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Super admin manage contact messages" ON public.contact_messages
    FOR SELECT USING (public.get_my_role() = 'super_admin');

CREATE POLICY "Super admin update contact messages" ON public.contact_messages
    FOR UPDATE USING (public.get_my_role() = 'super_admin');

-- RLS policies only take effect once the role has table-level privileges.
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;

