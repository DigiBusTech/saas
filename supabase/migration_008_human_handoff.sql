-- MIGRATION 008: Human Handoff & Realtime Messaging

-- 1. Add AI status to the CRM to control who is replying
ALTER TABLE public.workspace_crm 
ADD COLUMN IF NOT EXISTS ai_status VARCHAR(20) DEFAULT 'active'; 
-- Statuses: 'active' (AI replies), 'paused' (Human is replying)

-- 2. Create the messages table to store the actual chat history
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    crm_id UUID NOT NULL REFERENCES public.workspace_crm(id) ON DELETE CASCADE,
    direction VARCHAR(10) NOT NULL, -- 'inbound' (from user) or 'outbound' (from bot/human)
    sender_type VARCHAR(20) NOT NULL, -- 'user', 'ai_agent', 'human_agent'
    content TEXT NOT NULL,
    platform VARCHAR(20) NOT NULL, -- 'whatsapp', 'telegram'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_crm ON public.chat_messages(crm_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_workspace ON public.chat_messages(workspace_id, created_at);

-- 3. Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Chat Messages RLS" ON public.chat_messages;
CREATE POLICY "Chat Messages RLS" ON public.chat_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = chat_messages.workspace_id AND tenant_id = public.get_my_tenant_id())
);

-- 4. Turn on Supabase Realtime for the new table so the UI updates instantly
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.workspace_crm;
