'use server';

import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/inngest/client';
import { revalidatePath } from 'next/cache';
import type { WorkspaceCRM, ChatMessage } from '@/lib/types/database';

// ---------- READ: Conversations list (left pane) ----------

export async function getInboxConversations(workspaceId: string): Promise<WorkspaceCRM[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('workspace_crm')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('last_interaction', { ascending: false });
  return (data ?? []) as WorkspaceCRM[];
}

// ---------- READ: Message history for a selected contact (right pane) ----------

export async function getChatMessages(workspaceId: string, crmId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('crm_id', crmId)
    .order('created_at', { ascending: true });
  return (data ?? []) as ChatMessage[];
}

// ---------- AI Toggle (Human Handoff) ----------

export async function setAIStatus(workspaceId: string, crmId: string, status: 'active' | 'paused') {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_crm')
    .update({ ai_status: status })
    .eq('id', crmId)
    .eq('workspace_id', workspaceId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/inbox`);
  return { error: null };
}

// ---------- Send manual message (human agent) ----------

export async function sendManualMessage(workspaceId: string, crmId: string, content: string) {
  const trimmed = content?.trim();
  if (!trimmed) return { error: 'Message cannot be empty' };

  const supabase = await createClient();

  // Load the CRM contact to know platform + recipient
  const { data: contact, error: contactError } = await supabase
    .from('workspace_crm')
    .select('id, platform, platform_user_id, phone_number')
    .eq('id', crmId)
    .eq('workspace_id', workspaceId)
    .single();

  if (contactError || !contact) return { error: 'Contact not found' };
  if (contact.platform === 'web') return { error: 'Web Chat replies are sent by the assistant through the public chat. Use the conversation view to review the thread.' };

  // 1. Insert the human agent message into chat_messages
  const { error: insertError } = await supabase.from('chat_messages').insert({
    workspace_id: workspaceId,
    crm_id: crmId,
    direction: 'outbound',
    sender_type: 'human_agent',
    content: trimmed,
    platform: contact.platform,
  });

  if (insertError) return { error: insertError.message };

  // Bump last_interaction so it floats to the top of the inbox
  await supabase
    .from('workspace_crm')
    .update({ last_interaction: new Date().toISOString() })
    .eq('id', crmId);

  // 2. Dispatch an Inngest event to deliver via the platform API
  const eventName = contact.platform === 'telegram' ? 'telegram.send_manual' : 'whatsapp.send_manual';
  await inngest.send({
    name: eventName,
    data: {
      workspaceId,
      crmId,
      platform: contact.platform,
      recipient: contact.phone_number || contact.platform_user_id,
      platformUserId: contact.platform_user_id,
      content: trimmed,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/inbox`);
  return { error: null };
}
