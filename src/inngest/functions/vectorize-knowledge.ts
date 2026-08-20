import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/server';
import { logTelemetry, normalizeError } from '@/lib/telemetry';

/**
 * Generate an embedding vector for a piece of text using an OpenAI-compatible
 * embeddings endpoint. Returns null on failure so the caller can decide how to
 * handle a degraded (non-vectorized) document.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.OPENAI_API_KEY
    ? 'https://api.openai.com/v1'
    : 'https://api.openai.com/v1';

  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Embeddings API HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding ?? null;
}

/**
 * knowledge.vectorize — background job that embeds a knowledge_bases row into
 * pgvector and updates its `status`.
 *
 *   success -> status = 'INDEXED'
 *   failure -> status = 'FAILED' + telemetry error entry
 *
 * Triggered when a document is created or edited.
 */
export const vectorizeKnowledge = inngest.createFunction(
  {
    id: 'knowledge-vectorize',
    retries: 2,
    triggers: [{ event: 'knowledge.vectorize' }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { knowledgeId, tenantId, workspaceId } = event.data;

    if (!knowledgeId) {
      await logTelemetry({
        severity: 'error',
        source: 'vector_embeddings',
        message: 'knowledge.vectorize invoked without knowledgeId',
        metadata: { event: event.data },
      });
      return { status: 'skipped', reason: 'missing_knowledge_id' };
    }

    const db = createServiceClient();

    // STEP 1: Load the document content.
    const doc = await step.run('load-document', async () => {
      const { data, error } = await db
        .from('knowledge_bases')
        .select('id, title, content, tenant_id, workspace_id')
        .eq('id', knowledgeId)
        .single();
      if (error || !data) throw new Error(`Knowledge document ${knowledgeId} not found`);
      return data;
    });

    // STEP 2: Embed + persist, updating status accordingly.
    try {
      const embedding = await step.run('generate-embedding', async () => {
        return await generateEmbedding(doc.content ?? '');
      });

      await step.run('persist-indexed', async () => {
        const updateData: Record<string, any> = { status: 'INDEXED' };
        if (embedding) updateData.embedding = JSON.stringify(embedding);
        const { error } = await db
          .from('knowledge_bases')
          .update(updateData)
          .eq('id', knowledgeId);
        if (error) throw new Error(`Failed to persist INDEXED status: ${error.message}`);
      });

      await logTelemetry({
        severity: 'info',
        source: 'vector_embeddings',
        message: `Knowledge document "${doc.title}" vectorized and indexed.`,
        workspaceId: workspaceId ?? doc.workspace_id ?? null,
        tenantId: tenantId ?? doc.tenant_id ?? null,
        metadata: { knowledgeId, embedded: !!embedding },
        isResolved: true,
      });

      return { status: 'INDEXED', knowledgeId, embedded: !!embedding };
    } catch (err) {
      const { message, stack } = normalizeError(err);

      // Mark the row FAILED so the UI does not hang on PENDING forever.
      await step.run('persist-failed', async () => {
        await db.from('knowledge_bases').update({ status: 'FAILED' }).eq('id', knowledgeId);
      });

      await logTelemetry({
        severity: 'error',
        source: 'vector_embeddings',
        endpoint: 'knowledge.vectorize',
        message: `Vectorization failed for "${doc.title}": ${message}`,
        stackTrace: stack,
        workspaceId: workspaceId ?? doc.workspace_id ?? null,
        tenantId: tenantId ?? doc.tenant_id ?? null,
        metadata: { knowledgeId },
      });

      // Re-throw so Inngest retries; final failure remains logged + FAILED.
      throw err;
    }
  }
);
