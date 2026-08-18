'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getWorkspaceAutomations(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspace_automations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createAutomation(workspaceId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const triggerType = formData.get('trigger_type') as string;
  const triggerDaysBefore = parseInt(formData.get('trigger_days_before') as string) || 0;
  const messageTemplate = formData.get('message_template') as string;
  const mediaUrl = formData.get('media_url') as string;
  const ctaButtonText = formData.get('cta_button_text') as string;
  const ctaLink = formData.get('cta_link') as string;

  if (!title || !triggerType || !messageTemplate) {
    return { error: 'Title, trigger type, and message template are required' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_automations')
    .insert({
      workspace_id: workspaceId,
      title,
      trigger_type: triggerType,
      trigger_days_before: triggerDaysBefore,
      message_template: messageTemplate,
      media_url: mediaUrl || null,
      cta_button_text: ctaButtonText || null,
      cta_link: ctaLink || null,
    });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/automations`);
  return { error: null };
}

export async function updateAutomation(automationId: string, workspaceId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const triggerType = formData.get('trigger_type') as string;
  const triggerDaysBefore = parseInt(formData.get('trigger_days_before') as string) || 0;
  const messageTemplate = formData.get('message_template') as string;
  const mediaUrl = formData.get('media_url') as string;
  const ctaButtonText = formData.get('cta_button_text') as string;
  const ctaLink = formData.get('cta_link') as string;

  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_automations')
    .update({
      title,
      trigger_type: triggerType,
      trigger_days_before: triggerDaysBefore,
      message_template: messageTemplate,
      media_url: mediaUrl || null,
      cta_button_text: ctaButtonText || null,
      cta_link: ctaLink || null,
    })
    .eq('id', automationId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/automations`);
  return { error: null };
}

export async function toggleAutomation(automationId: string, workspaceId: string, isActive: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_automations')
    .update({ is_active: isActive })
    .eq('id', automationId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/automations`);
  return { error: null };
}

export async function deleteAutomation(automationId: string, workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_automations')
    .delete()
    .eq('id', automationId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/automations`);
  return { error: null };
}
