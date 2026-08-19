-- MIGRATION 024: Keep conversations isolated between workspaces

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_tenant_id_platform_platform_chat_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_workspace_platform_chat_key
  ON public.conversations (workspace_id, platform, platform_chat_id);