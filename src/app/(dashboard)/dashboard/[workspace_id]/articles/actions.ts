'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { sendInngestEvent } from '@/lib/inngest/dynamic';
import { revalidatePath } from 'next/cache';

export async function getWorkspaceArticles(workspaceId: string) {
  const db = await createClient();
  const { data, error } = await db.from('workspace_articles').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  return { data: data ?? [], error: error?.message ?? null };
}

export async function createArticle(workspaceId: string, formData: FormData) {
  const db = await createClient();
  const title = String(formData.get('title') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!title || content.length < 20) return { error: 'Title and at least 20 characters of content are required' };
  const { data: workspace } = await db.from('workspaces').select('tenant_id').eq('id', workspaceId).single();
  if (!workspace) return { error: 'Workspace not found' };
  const { data: article, error } = await db.from('workspace_articles').insert({ workspace_id: workspaceId, title, slug, excerpt: String(formData.get('excerpt') ?? '') || null, content, cover_image_url: String(formData.get('cover_image_url') ?? '') || null, is_published: formData.get('is_published') === 'true', show_on_sabibio: formData.get('show_on_sabibio') === 'true' }).select('id').single();
  if (error || !article) return { error: error?.message ?? 'Could not create article' };
  const service = createServiceClient();
  const { data: knowledge } = await service.from('knowledge_bases').insert({ tenant_id: workspace.tenant_id, workspace_id: workspaceId, title, content, status: 'PENDING' }).select('id').single();
  if (knowledge) { await db.from('workspace_articles').update({ knowledge_id: knowledge.id }).eq('id', article.id); await sendInngestEvent({ name: 'knowledge.vectorize', data: { knowledgeId: knowledge.id, tenantId: workspace.tenant_id, workspaceId } }); }
  revalidatePath(`/dashboard/${workspaceId}/articles`);
  revalidatePath(`/dashboard/${workspaceId}/knowledge`);
  return { error: null };
}
