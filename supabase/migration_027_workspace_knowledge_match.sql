-- MIGRATION 027: Workspace-aware semantic knowledge base lookup
-- Additive only — does not modify or replace the existing match_knowledge function.

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
    AND (kb.workspace_id = match_workspace_id OR kb.workspace_id IS NULL)
    AND kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
