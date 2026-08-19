'use server';

import { createClient } from '@/lib/supabase/server';
import { sendInngestEvent } from '@/lib/inngest/dynamic';
import { revalidatePath } from 'next/cache';

export async function approveCopilotDraft(workspaceId: string, messageId: string) {
  const supabase = await createClient();
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .select('id, content, approval_status, conversation_id, conversations!inner(id, workspace_id, platform, platform_chat_id)')
    .eq('id', messageId)
    .eq('conversations.workspace_id', workspaceId)
    .single();

  if (messageError || !message) return { error: 'Draft not found or access denied.' };
  if (message.approval_status !== 'pending_approval') return { error: 'This draft has already been handled.' };

  const conversation = Array.isArray(message.conversations) ? message.conversations[0] : message.conversations;
  if (!conversation) return { error: 'Conversation not found.' };

  const { error: updateError } = await supabase
    .from('messages')
    .update({ approval_status: 'sent' })
    .eq('id', messageId)
    .eq('approval_status', 'pending_approval');
  if (updateError) return { error: updateError.message };

  const eventName = conversation.platform === 'telegram' ? 'telegram.send_manual' : 'whatsapp.send_manual';
  await sendInngestEvent({
    name: eventName,
    data: {
      workspaceId,
      platform: conversation.platform,
      recipient: conversation.platform_chat_id,
      platformUserId: conversation.platform_chat_id,
      content: message.content,
    },
  });

  revalidatePath(`/dashboard/${workspaceId}/conversations`);
  return { error: null };
}