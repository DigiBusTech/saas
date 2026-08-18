-- =============================================================================
-- SabiBio Multi-Tenant AI Chat SaaS — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================================================

-- 0. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";       -- pgvector for embeddings

-- =============================================================================
-- 1. TENANTS — each row is one paying business / client
-- =============================================================================
CREATE TABLE public.tenants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    plan_type     TEXT NOT NULL DEFAULT 'trial'
                  CHECK (plan_type IN ('trial','basic','pro','unlimited')),
    token_usage   BIGINT NOT NULL DEFAULT 0,
    message_usage BIGINT NOT NULL DEFAULT 0,
    setup_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
    status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','expired','suspended')),
    stripe_customer_id   TEXT,
    stripe_subscription_id TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. USERS — linked to Supabase Auth (auth.users) via id
-- =============================================================================
CREATE TABLE public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id   UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    role        TEXT NOT NULL DEFAULT 'agent'
                CHECK (role IN ('super_admin','tenant_admin','agent')),
    email       TEXT NOT NULL,
    full_name   TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- super_admin users have tenant_id = NULL (they are platform-level)

-- =============================================================================
-- 3. INTEGRATIONS — per-tenant platform credentials
-- =============================================================================
CREATE TABLE public.integrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    platform        TEXT NOT NULL CHECK (platform IN ('telegram','whatsapp')),
    bot_token       TEXT,           -- encrypted at rest by Supabase
    phone_number_id TEXT,           -- WhatsApp Business Phone Number ID
    verify_secret   TEXT,           -- webhook verification secret
    access_token    TEXT,           -- WhatsApp permanent access token
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, platform)
);

-- =============================================================================
-- 4. KNOWLEDGE_BASES — tenant grounding documents with vector embeddings
-- =============================================================================
CREATE TABLE public.knowledge_bases (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    embedding   vector(1536),       -- OpenAI-compatible embedding dimension
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_bases_tenant ON public.knowledge_bases(tenant_id);

-- Similarity search function for RAG
CREATE OR REPLACE FUNCTION match_knowledge(
    query_embedding vector(1536),
    match_tenant_id UUID,
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.title,
        kb.content,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_bases kb
    WHERE kb.tenant_id = match_tenant_id
      AND kb.embedding IS NOT NULL
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- =============================================================================
-- 5. CONVERSATIONS — per-tenant chat sessions from WhatsApp/Telegram
-- =============================================================================
CREATE TABLE public.conversations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    integration_id    UUID REFERENCES public.integrations(id) ON DELETE SET NULL,
    platform          TEXT NOT NULL CHECK (platform IN ('telegram','whatsapp')),
    platform_chat_id  TEXT NOT NULL,   -- e.g. WhatsApp phone or Telegram chat_id
    contact_name      TEXT,
    status            TEXT NOT NULL DEFAULT 'ai_active'
                      CHECK (status IN ('ai_active','human_handoff','resolved')),
    outcome           TEXT CHECK (outcome IN ('sale','inquiry','complaint',NULL)),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, platform, platform_chat_id)
);

CREATE INDEX idx_conversations_tenant ON public.conversations(tenant_id);
CREATE INDEX idx_conversations_status ON public.conversations(tenant_id, status);

-- =============================================================================
-- 6. MESSAGES — individual messages within a conversation
-- =============================================================================
CREATE TABLE public.messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_type       TEXT NOT NULL CHECK (sender_type IN ('user','bot','human')),
    sender_name       TEXT,
    content           TEXT NOT NULL,
    tokens_used       INT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(conversation_id, created_at);

-- =============================================================================
-- 7. UPDATED_AT TRIGGER — auto-update timestamps
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_integrations_updated_at
    BEFORE UPDATE ON public.integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_knowledge_bases_updated_at
    BEFORE UPDATE ON public.knowledge_bases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 8. AUTO-CREATE USER PROFILE ON SIGNUP
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, role, tenant_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'tenant_admin'),
        CASE
            WHEN NEW.raw_user_meta_data->>'role' = 'super_admin' THEN NULL
            ELSE (NEW.raw_user_meta_data->>'tenant_id')::UUID
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
