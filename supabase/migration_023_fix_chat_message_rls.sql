-- MIGRATION 023: Allow tenant users to read and receive their inbox messages

DROP POLICY IF EXISTS "Chat Messages RLS" ON public.chat_messages;
CREATE POLICY "Chat Messages RLS" ON public.chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.workspaces
      WHERE workspaces.id = chat_messages.workspace_id
        AND workspaces.tenant_id = public.get_my_tenant_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.workspaces
      WHERE workspaces.id = chat_messages.workspace_id
        AND workspaces.tenant_id = public.get_my_tenant_id()
    )
  );