-- =========================================================================
-- Migration 033: RAG Citations & Source URL Support
-- Adds source_url field to knowledge_bases for proper citation tracking
-- =========================================================================

-- Add source_url column to knowledge_bases for citation support
ALTER TABLE public.knowledge_bases 
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Drop existing functions first (return type is changing)
DROP FUNCTION IF EXISTS match_knowledge(vector, uuid, double precision, integer);
DROP FUNCTION IF EXISTS public.match_knowledge_workspace(vector, uuid, uuid, double precision, integer);

-- Update match_knowledge function to return source_url
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
    source_url TEXT,
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
        kb.source_url,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM public.knowledge_bases kb
    WHERE kb.tenant_id = match_tenant_id
      AND kb.embedding IS NOT NULL
      AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Update match_knowledge_workspace function to return source_url
CREATE OR REPLACE FUNCTION public.match_knowledge_workspace(
  query_embedding vector(1536),
  match_tenant_id UUID,
  match_workspace_id UUID,
  match_threshold FLOAT DEFAULT 0.72,
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  source_url TEXT,
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
    kb.source_url,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_bases kb
  WHERE kb.tenant_id = match_tenant_id
    AND (kb.workspace_id = match_workspace_id OR kb.workspace_id IS NULL)
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
