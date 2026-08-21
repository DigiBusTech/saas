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
  // PHASE 5.5: Multi-channel support
  const channelFilterRaw = formData.get('channel_filter') as string;
  const channelFilter = channelFilterRaw ? JSON.parse(channelFilterRaw) : ['whatsapp', 'telegram'];
  const emailSubject = formData.get('email_subject') as string;
  // PHASE 5.5: Scheduling support
  const automationType = (formData.get('automation_type') as string) || 'trigger';
  const scheduledAt = formData.get('scheduled_at') as string;

  if (!title || !triggerType || !messageTemplate) {
    return { error: 'Title, trigger type, and message template are required' };
  }

  // PHASE 5.5: Validate email subject if email channel selected
  if (channelFilter.includes('email') && !emailSubject) {
    return { error: 'Email subject is required when email channel is selected' };
  }

  // PHASE 5.5: Validate scheduled_at if type is scheduled
  if (automationType === 'scheduled' && !scheduledAt) {
    return { error: 'Scheduled date/time is required for scheduled automations' };
  }

  // Determine initial status based on automation type
  let status = 'active';
  if (automationType === 'instant') status = 'draft'; // Instant sends are drafts until user clicks "Send Now"
  if (automationType === 'scheduled') status = 'scheduled';

  const supabase = await createClient();
  
  // Insert automation
  const { data: newAutomation, error } = await supabase
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
      channel_filter: channelFilter, // PHASE 5.5
      email_subject: emailSubject || null, // PHASE 5.5
      automation_type: automationType, // PHASE 5.5
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null, // PHASE 5.5
      status, // PHASE 5.5
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // PHASE 5.5: Insert drip steps if automation type is 'drip'
  if (automationType === 'drip' && newAutomation) {
    const dripSteps: Array<{
      automation_id: string;
      workspace_id: string;
      step_number: number;
      delay_minutes: number;
      delivery_time: string | null;
      message_template: string;
    }> = [];

    // Extract drip step data from formData
    let stepNumber = 1;
    while (formData.has(`drip_step_${stepNumber}_message`)) {
      const delayMinutes = parseInt(formData.get(`drip_step_${stepNumber}_delay`) as string) || 0;
      const deliveryTime = formData.get(`drip_step_${stepNumber}_time`) as string;
      const stepMessage = formData.get(`drip_step_${stepNumber}_message`) as string;

      if (stepMessage) {
        dripSteps.push({
          automation_id: newAutomation.id,
          workspace_id: workspaceId,
          step_number: stepNumber,
          delay_minutes: delayMinutes,
          delivery_time: deliveryTime || null,
          message_template: stepMessage,
        });
      }

      stepNumber++;
    }

    if (dripSteps.length > 0) {
      const { error: stepsError } = await supabase
        .from('workspace_automation_steps')
        .insert(dripSteps);

      if (stepsError) {
        // Rollback automation creation
        await supabase.from('workspace_automations').delete().eq('id', newAutomation.id);
        return { error: `Failed to create drip steps: ${stepsError.message}` };
      }
    }
  }

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
  // PHASE 5.5: Multi-channel support
  const channelFilterRaw = formData.get('channel_filter') as string;
  const channelFilter = channelFilterRaw ? JSON.parse(channelFilterRaw) : ['whatsapp', 'telegram'];
  const emailSubject = formData.get('email_subject') as string;
  // PHASE 5.5: Scheduling support
  const automationType = (formData.get('automation_type') as string) || 'trigger';
  const scheduledAt = formData.get('scheduled_at') as string;

  // Determine status update based on automation type
  let status: string | undefined;
  if (automationType === 'instant') status = 'draft';
  if (automationType === 'scheduled') status = 'scheduled';
  if (automationType === 'trigger') status = 'active';

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
      channel_filter: channelFilter, // PHASE 5.5
      email_subject: emailSubject || null, // PHASE 5.5
      automation_type: automationType, // PHASE 5.5
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null, // PHASE 5.5
      ...(status ? { status } : {}), // PHASE 5.5
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
