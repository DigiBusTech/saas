import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { logTelemetry, normalizeError } from '@/lib/telemetry';

/**
 * Resolves the OpenAI API key used for embeddings only — env var first, then
 * the Super Admin-managed system_configs value (same pattern as GROQ_API_KEY).
 * Groq has no embeddings endpoint, so a Groq-only key must never be used here.
 */
async function resolveEmbeddingApiKey(): Promise<string> {
  if (process.env.OPENAI_API_KEY?.trim()) return process.env.OPENAI_API_KEY.trim();

  const db = createServiceClient();
  const { data } = await db.from('system_configs').select('config_value, is_secret').eq('config_key', 'OPENAI_API_KEY').maybeSingle();
  if (data?.config_value) {
    try { return data.is_secret ? decrypt(data.config_value) : data.config_value; } catch { return ''; }
  }
  return '';
}

/**
 * Generate an embedding vector for a piece of text using OpenAI's embeddings
 * endpoint. Returns null (never throws for a missing key) so the caller can
 * decide how to handle a degraded (non-vectorized) document.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = await resolveEmbeddingApiKey();
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/embeddings', {
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
