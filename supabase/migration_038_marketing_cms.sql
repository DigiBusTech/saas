-- =========================================================================
-- Migration 038: Marketing CMS - Reviews & Trust Badges
-- Dynamic testimonials and partner logos for high-converting landing page
-- =========================================================================

-- 1. Create platform_reviews table for customer testimonials
CREATE TABLE IF NOT EXISTS public.platform_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_name TEXT NOT NULL,
    author_title TEXT,
    company_name TEXT,
    review_text TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    avatar_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_reviews IS 'Customer testimonials displayed on landing page for social proof';
COMMENT ON COLUMN public.platform_reviews.rating IS 'Star rating from 1-5';
COMMENT ON COLUMN public.platform_reviews.display_order IS 'Sort order for testimonials (lower = higher priority)';

-- Index for fetching published reviews
CREATE INDEX IF NOT EXISTS idx_platform_reviews_published ON public.platform_reviews(is_published, display_order);

-- Trigger for updated_at
CREATE TRIGGER set_platform_reviews_updated_at
    BEFORE UPDATE ON public.platform_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Create trusted_partners table for logos and compliance badges
CREATE TABLE IF NOT EXISTS public.trusted_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL DEFAULT 'partner' CHECK (entity_type IN ('partner', 'compliance', 'certification', 'integration', 'media')),
    logo_url TEXT NOT NULL,
    link_url TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.trusted_partners IS 'Partner logos, compliance badges, and certifications for trust signals';
COMMENT ON COLUMN public.trusted_partners.entity_type IS 'Category: partner (companies), compliance (NDPC), certification, integration, media';
COMMENT ON COLUMN public.trusted_partners.display_order IS 'Sort order for logo display (lower = higher priority)';

-- Index for fetching active partners
CREATE INDEX IF NOT EXISTS idx_trusted_partners_active ON public.trusted_partners(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_trusted_partners_type ON public.trusted_partners(entity_type, is_active);

-- Trigger for updated_at
CREATE TRIGGER set_trusted_partners_updated_at
    BEFORE UPDATE ON public.trusted_partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. RLS Policies for public read access
ALTER TABLE public.platform_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_partners ENABLE ROW LEVEL SECURITY;

-- Super Admin full access
CREATE POLICY "super_admin_reviews_full_access" ON public.platform_reviews
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "super_admin_partners_full_access" ON public.trusted_partners
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    );

-- Public read access for published content
CREATE POLICY "anyone_read_published_reviews" ON public.platform_reviews
    FOR SELECT USING (is_published = TRUE);

CREATE POLICY "anyone_read_active_partners" ON public.trusted_partners
    FOR SELECT USING (is_active = TRUE);

-- 4. Seed initial data - Nigerian market focused compliance badges
INSERT INTO public.trusted_partners (entity_name, entity_type, logo_url, link_url, description, is_active, display_order) VALUES
('National Startup Label Nigeria', 'certification', 'https://placehold.co/200x80/1e293b/ffffff?text=Startup+Label', 'https://www.nitda.gov.ng', 'Recognized by Nigeria Information Technology Development Agency', TRUE, 1),
('NDPC Compliant', 'compliance', 'https://placehold.co/200x80/1e293b/ffffff?text=NDPC', 'https://ndpc.gov.ng', 'Nigeria Data Protection Commission Compliant', TRUE, 2),
('ISO 27001 Certified', 'certification', 'https://placehold.co/200x80/1e293b/ffffff?text=ISO+27001', NULL, 'Information Security Management System', TRUE, 3),
('WhatsApp Business Partner', 'integration', 'https://placehold.co/200x80/1e293b/ffffff?text=WhatsApp', 'https://business.whatsapp.com', 'Official WhatsApp Business API Partner', TRUE, 4),
('Telegram Verified Bot', 'integration', 'https://placehold.co/200x80/1e293b/ffffff?text=Telegram', 'https://telegram.org', 'Verified Telegram Bot Platform', TRUE, 5),
('Techpoint Africa Featured', 'media', 'https://placehold.co/200x80/1e293b/ffffff?text=Techpoint', 'https://techpoint.africa', 'Featured on Techpoint Africa', TRUE, 6)
ON CONFLICT DO NOTHING;

-- 5. Seed initial testimonials - Nigerian business context
INSERT INTO public.platform_reviews (author_name, author_title, company_name, review_text, rating, is_published, display_order) VALUES
('Adebayo Ogunleye', 'CEO & Founder', 'TrendyWears Lagos', 'SabiBio transformed how we handle customer inquiries. Our WhatsApp orders increased 300% in just 2 months. The AI assistant handles everything while we sleep!', 5, TRUE, 1),
('Chioma Nwankwo', 'Operations Manager', 'FreshMart Delivery', 'Before SabiBio, we were drowning in messages across 3 platforms. Now everything is in one dashboard. Our team response time went from hours to minutes.', 5, TRUE, 2),
('Ibrahim Yusuf', 'Digital Marketing Lead', 'SmartGadgets NG', 'The automated follow-ups are a game changer. We never lose a lead anymore. The AI knows exactly when to send reminders and what to say.', 5, TRUE, 3),
('Blessing Eze', 'Small Business Owner', 'B''s Beauty Essentials', 'As a solo entrepreneur, SabiBio is like having a 24/7 sales team. I can finally focus on growing my business instead of replying to messages all day.', 5, TRUE, 4),
('Olumide Adeyemi', 'CTO', 'PayFlex Technologies', 'We evaluated 5 customer engagement platforms. SabiBio''s Nigerian market focus, NDPC compliance, and local payment integration made it an easy choice.', 5, TRUE, 5),
('Fatima Mohammed', 'E-commerce Director', 'Naija Craft Hub', 'The analytics dashboard shows us exactly which products customers ask about most. We''ve optimized our inventory based on AI chat insights. Brilliant!', 5, TRUE, 6)
ON CONFLICT DO NOTHING;

-- 6. Grant necessary permissions
GRANT SELECT ON public.platform_reviews TO authenticated, anon;
GRANT SELECT ON public.trusted_partners TO authenticated, anon;

-- 7. Enable realtime for admin preview
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_reviews;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trusted_partners;
