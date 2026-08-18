-- =============================================================================
-- Migration 005: Phase 8 — CMS Pages & Documentation
-- Run AFTER migration_004_phase7_dynamic_plans.sql in the Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. PAGES — CMS pages with dynamic content blocks
-- =============================================================================
CREATE TABLE public.pages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              TEXT NOT NULL UNIQUE,
    title             TEXT NOT NULL,
    meta_description  TEXT,
    published_status  TEXT NOT NULL DEFAULT 'draft' CHECK (published_status IN ('draft','published')),
    content_blocks    JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_pages_updated_at
    BEFORE UPDATE ON public.pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Super Admin: full CRUD
CREATE POLICY "super_admin_all_pages" ON public.pages
    FOR ALL USING (public.get_my_role() = 'super_admin');

-- Public: read published pages (no auth required)
CREATE POLICY "public_read_published_pages" ON public.pages
    FOR SELECT USING (published_status = 'published');

-- =============================================================================
-- 2. DOCS — Documentation articles
-- =============================================================================
CREATE TABLE public.docs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              TEXT NOT NULL UNIQUE,
    title             TEXT NOT NULL,
    category          TEXT,
    content           TEXT NOT NULL DEFAULT '',
    sort_order        INTEGER NOT NULL DEFAULT 0,
    published_status  TEXT NOT NULL DEFAULT 'draft' CHECK (published_status IN ('draft','published')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_docs_updated_at
    BEFORE UPDATE ON public.docs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;

-- Super Admin: full CRUD
CREATE POLICY "super_admin_all_docs" ON public.docs
    FOR ALL USING (public.get_my_role() = 'super_admin');

-- Public: read published docs
CREATE POLICY "public_read_published_docs" ON public.docs
    FOR SELECT USING (published_status = 'published');
