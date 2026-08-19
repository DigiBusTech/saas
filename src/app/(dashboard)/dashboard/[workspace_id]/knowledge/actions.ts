'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { chunkText } from '@/lib/chunker';
import { sendInngestEvent } from '@/lib/inngest/dynamic';
import { logTelemetry, normalizeError } from '@/lib/telemetry';
import { z } from 'zod';

const knowledgeSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  content: z.string().min(10, 'Content must be at least 10 characters').max(50000),
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

export async function addKnowledgeDocument(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    if (!profile?.tenant_id) return { error: 'No tenant found' };

    const raw = {
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      workspaceId: formData.get('workspace_id') as string,
    };

    const parsed = knowledgeSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const { title, content, workspaceId } = parsed.data;

    // Verify workspace belongs to tenant
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!workspace) return { error: 'Workspace not found or unauthorized' };

    // Chunk the content for better retrieval
    const chunks = chunkText(content);
    const db = createServiceClient();

    const createdIds: string[] = [];

    for (const chunk of chunks) {
      const chunkTitle = chunks.length > 1 ? `${title} (Part ${chunk.index + 1})` : title;

      // Insert with PENDING status — vectorization happens asynchronously.
      const { data: inserted, error } = await db
        .from('knowledge_bases')
        .insert({
          tenant_id: profile.tenant_id,
          workspace_id: workspaceId,
          title: chunkTitle,
          content: chunk.text,
          status: 'PENDING',
        })
        .select('id')
        .single();

      if (error) {
        await logTelemetry({
          severity: 'error',
          source: 'vector_embeddings',
          message: `Failed to insert knowledge chunk: ${error.message}`,
          tenantId: profile.tenant_id,
          workspaceId,
        });
        return { error: `Failed to save chunk ${chunk.index + 1}: ${error.message}` };
      }

      if (inserted?.id) createdIds.push(inserted.id);
    }

    // Fire the vectorization job for each created chunk.
    for (const knowledgeId of createdIds) {
      await sendInngestEvent({
        name: 'knowledge.vectorize',
        data: { knowledgeId, tenantId: profile.tenant_id, workspaceId },
      });
    }

    revalidatePath(`/dashboard/${workspaceId}/knowledge`);
    return { success: true, chunksCreated: chunks.length };
  } catch (err) {
    const { message, stack } = normalizeError(err);
    await logTelemetry({
      severity: 'error',
      source: 'vector_embeddings',
      endpoint: 'addKnowledgeDocument',
      message,
      stackTrace: stack,
    });
    return { error: message };
  }
}

export async function deleteKnowledgeDocument(id: string, workspaceId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('knowledge_bases').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/dashboard/${workspaceId}/knowledge`);
    return { success: true };
  } catch (err) {
    const { message } = normalizeError(err);
    return { error: message };
  }
}

export async function updateKnowledgeDocument(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    if (!profile?.tenant_id) return { error: 'No tenant found' };

    const id = formData.get('id') as string;
    const content = formData.get('content') as string;
    const title = formData.get('title') as string;
    const workspaceId = formData.get('workspace_id') as string;

    if (!id || !content || !title) return { error: 'All fields are required' };

    const db = createServiceClient();

    // Update content and reset status to PENDING until re-indexed.
    const { error } = await db
      .from('knowledge_bases')
      .update({ title, content, status: 'PENDING' })
      .eq('id', id);
    if (error) return { error: error.message };

    // Re-trigger vectorization.
    await sendInngestEvent({
      name: 'knowledge.vectorize',
      data: { knowledgeId: id, tenantId: profile.tenant_id, workspaceId },
    });

    revalidatePath(`/dashboard/${workspaceId}/knowledge`);
    return { success: true };
  } catch (err) {
    const { message, stack } = normalizeError(err);
    await logTelemetry({
      severity: 'error',
      source: 'vector_embeddings',
      endpoint: 'updateKnowledgeDocument',
      message,
      stackTrace: stack,
    });
    return { error: message };
  }
}
