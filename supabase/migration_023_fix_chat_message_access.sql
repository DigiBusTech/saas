-- MIGRATION 023: Fix tenant-scoped Inbox message access and realtime

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat Messages RLS" ON public.chat_messages;
DROP POLICY IF EXISTS "Tenants view own chat messages" ON public.chat_messages;
CREATE POLICY "Chat Messages RLS" ON public.chat_messages FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = chat_messages.workspace_id
      AND workspaces.tenant_id = public.get_my_tenant_id()
  )
);