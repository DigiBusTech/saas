'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';

export async function setConversationStatus(conversationId: string, status: 'ai_active' | 'human_handoff' | 'resolved') {
  const supabase = await createClient();
  const { error } = await supabase
    .from('conversations')
    .update({ status })
    .eq('id', conversationId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/conversations');
  return { success: true };
}

export async function sendOperatorReply(formData: FormData) {
  const conversationId = formData.get('conversation_id') as string;
  const content = (formData.get('content') as string)?.trim();

  if (!conversationId || !content) return { error: 'Missing fields' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single();

  // Get conversation details
  const { data: conversation } = await supabase
    .from('conversations')
    .select('platform, platform_chat_id, integration_id, tenant_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) return { error: 'Conversation not found' };

  // 1. Log the message in the database
  const { error: msgError } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_type: 'human',
    sender_name: profile?.full_name ?? user.email ?? 'Operator',
    content,
  });

  if (msgError) return { error: msgError.message };

  // 2. Ensure conversation stays in human_handoff mode
  await supabase.from('conversations').update({ status: 'human_handoff' }).eq('id', conversationId);

  // 3. Dispatch outbound via the platform API
  const db = createServiceClient();
  const { data: integration } = await db
    .from('integrations')
    .select('platform, bot_token, access_token, phone_number_id')
    .eq('id', conversation.integration_id)
    .single();

  if (!integration) {
    return { error: 'Integration not found — message logged but not dispatched' };
  }

  try {
    if (conversation.platform === 'telegram' && integration.bot_token) {
      let botToken: string;
      try { botToken = decrypt(integration.bot_token); } catch { botToken = integration.bot_token; }
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: conversation.platform_chat_id.replace('tg_', ''),
          text: content,
        }),
      });
      if (!res.ok) return { error: 'Message logged but Telegram delivery failed. Check integration credentials.' };
    } else if (conversation.platform === 'whatsapp' && integration.access_token && integration.phone_number_id) {
      let accessToken: string;
      try { accessToken = decrypt(integration.access_token); } catch { accessToken = integration.access_token; }
      const res = await fetch(`https://graph.facebook.com/v20.0/${integration.phone_number_id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: conversation.platform_chat_id,
          type: 'text',
          text: { body: content },
        }),
      });
      if (!res.ok) return { error: 'Message logged but WhatsApp delivery failed. Check integration credentials.' };
    }
  } catch (err) {
    console.error('Outbound dispatch failed:', err);
    return { error: 'Message logged but delivery failed. Check integration credentials.' };
  }

  revalidatePath('/dashboard/conversations');
  return { success: true };
}
