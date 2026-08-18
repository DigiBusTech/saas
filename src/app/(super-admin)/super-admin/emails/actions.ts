'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

export async function getEmailTemplates() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('template_slug');

  if (error) return { templates: [], error: error.message };
  return { templates: data ?? [], error: null };
}

export async function updateEmailTemplate(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;
  const subject = formData.get('subject') as string;
  const html_body = formData.get('html_body') as string;
  const variablesRaw = formData.get('variables') as string;

  if (!id || !subject || !html_body) {
    return { error: 'Missing required fields' };
  }

  let variables: string[] = [];
  try {
    variables = JSON.parse(variablesRaw || '[]');
  } catch {
    return { error: 'Invalid variables JSON' };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('email_templates')
    .update({ subject, html_body, variables })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/super-admin/emails');
  return { error: null };
}

export async function createEmailTemplate(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const template_slug = formData.get('template_slug') as string;
  const subject = formData.get('subject') as string;
  const html_body = formData.get('html_body') as string;
  const variablesRaw = formData.get('variables') as string;

  if (!template_slug || !subject || !html_body) {
    return { error: 'Missing required fields' };
  }

  let variables: string[] = [];
  try {
    variables = JSON.parse(variablesRaw || '[]');
  } catch {
    return { error: 'Invalid variables JSON' };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('email_templates')
    .insert({ template_slug, subject, html_body, variables });

  if (error) return { error: error.message };

  revalidatePath('/super-admin/emails');
  return { error: null };
}

export async function deleteEmailTemplate(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;

  if (!id) return { error: 'Missing template ID' };

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/super-admin/emails');
  return { error: null };
}
