'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

// ==================== PAGES ====================

export async function getPages() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return { pages: [], error: error.message };
  return { pages: data ?? [], error: null };
}

export async function createPage(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const slug = formData.get('slug') as string;
  const title = formData.get('title') as string;
  const meta_description = formData.get('meta_description') as string;
  const published_status = formData.get('published_status') as string || 'draft';
  const content_blocks_raw = formData.get('content_blocks') as string;

  if (!slug || !title) return { error: 'Slug and title are required' };

  let content_blocks = [];
  try { content_blocks = JSON.parse(content_blocks_raw || '[]'); } catch { return { error: 'Invalid content blocks JSON' }; }

  const supabase = createServiceClient();
  const { error } = await supabase.from('pages').insert({ slug, title, meta_description, published_status, content_blocks });

  if (error) return { error: error.message };
  revalidatePath('/super-admin/cms');
  return { error: null };
}

export async function updatePage(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const meta_description = formData.get('meta_description') as string;
  const published_status = formData.get('published_status') as string || 'draft';
  const content_blocks_raw = formData.get('content_blocks') as string;

  if (!id || !title) return { error: 'Missing required fields' };

  let content_blocks = [];
  try { content_blocks = JSON.parse(content_blocks_raw || '[]'); } catch { return { error: 'Invalid content blocks JSON' }; }

  const supabase = createServiceClient();
  const { error } = await supabase.from('pages').update({ title, meta_description, published_status, content_blocks }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/super-admin/cms');
  return { error: null };
}

export async function deletePage(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;
  if (!id) return { error: 'Missing page ID' };

  const supabase = createServiceClient();
  const { error } = await supabase.from('pages').delete().eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/super-admin/cms');
  return { error: null };
}

// ==================== DOCS ====================

export async function getDocs() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('docs')
    .select('*')
    .order('sort_order');

  if (error) return { docs: [], error: error.message };
  return { docs: data ?? [], error: null };
}

export async function createDoc(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const slug = formData.get('slug') as string;
  const title = formData.get('title') as string;
  const category = formData.get('category') as string;
  const content = formData.get('content') as string;
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0;
  const published_status = formData.get('published_status') as string || 'draft';

  if (!slug || !title) return { error: 'Slug and title are required' };

  const supabase = createServiceClient();
  const { error } = await supabase.from('docs').insert({ slug, title, category, content, sort_order, published_status });

  if (error) return { error: error.message };
  revalidatePath('/super-admin/cms');
  return { error: null };
}

export async function updateDoc(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const category = formData.get('category') as string;
  const content = formData.get('content') as string;
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0;
  const published_status = formData.get('published_status') as string || 'draft';

  if (!id || !title) return { error: 'Missing required fields' };

  const supabase = createServiceClient();
  const { error } = await supabase.from('docs').update({ title, category, content, sort_order, published_status }).eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/super-admin/cms');
  return { error: null };
}

export async function deleteDoc(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;
  if (!id) return { error: 'Missing doc ID' };

  const supabase = createServiceClient();
  const { error } = await supabase.from('docs').delete().eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/super-admin/cms');
  return { error: null };
}
