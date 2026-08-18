'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getWorkspaceCategories(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('workspace_categories')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name');
  return data ?? [];
}

export async function createCategory(workspaceId: string, formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const color = (formData.get('color') as string) || '#6366f1';

  if (!name) return { error: 'Category name is required' };

  const supabase = await createClient();
  const { error } = await supabase.from('workspace_categories').insert({
    workspace_id: workspaceId,
    name,
    color,
  });

  if (error) {
    if (error.code === '23505') return { error: 'A category with this name already exists' };
    return { error: error.message };
  }

  revalidatePath(`/dashboard/${workspaceId}/settings`);
  return { error: null };
}

export async function updateCategory(categoryId: string, workspaceId: string, formData: FormData) {
  const newName = (formData.get('name') as string)?.trim();
  const color = (formData.get('color') as string) || '#6366f1';

  if (!newName) return { error: 'Category name is required' };

  const supabase = await createClient();

  // Fetch the old name so we can propagate the rename to all contacts
  const { data: existing } = await supabase
    .from('workspace_categories')
    .select('name')
    .eq('id', categoryId)
    .single();

  const oldName = existing?.name;

  const { error } = await supabase
    .from('workspace_categories')
    .update({ name: newName, color })
    .eq('id', categoryId);

  if (error) {
    if (error.code === '23505') return { error: 'A category with this name already exists' };
    return { error: error.message };
  }

  // Propagate rename across all matching contacts in this workspace
  if (oldName && oldName !== newName) {
    await supabase
      .from('workspace_crm')
      .update({ category: newName })
      .eq('workspace_id', workspaceId)
      .eq('category', oldName);
  }

  revalidatePath(`/dashboard/${workspaceId}/settings`);
  revalidatePath(`/dashboard/${workspaceId}/crm`);
  return { error: null };
}

export async function deleteCategory(categoryId: string, workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_categories')
    .delete()
    .eq('id', categoryId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/settings`);
  return { error: null };
}
