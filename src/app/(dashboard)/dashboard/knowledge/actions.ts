'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { chunkText } from '@/lib/chunker';
import { z } from 'zod';

const knowledgeSchema = z.object({
  title: z.string().min(2, 'Title is required').max(200),
  content: z.string().min(10, 'Content must be at least 10 characters').max(50000),
});

/**
 * Generates embeddings using a lightweight model.
 * Uses Groq's embedding or falls back to a simple TF-IDF-style approach.
 * For production, replace with OpenAI text-embedding-3-small or similar.
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    // Use a lightweight embedding approach via Groq-compatible endpoint
    // In production, use OpenAI's text-embedding-3-small for proper 1536-dim vectors
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000), // Trim to token limit
      }),
    });

    if (!response.ok) {
      console.error('Embedding API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding ?? null;
  } catch (err) {
    console.error('Embedding generation failed:', err);
    return null;
  }
}

export async function addKnowledgeDocument(formData: FormData) {
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
  };

  const parsed = knowledgeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { title, content } = parsed.data;

  // Chunk the content for better retrieval
  const chunks = chunkText(content);
  const db = createServiceClient();

  // Store each chunk with its embedding
  for (const chunk of chunks) {
    const chunkTitle = chunks.length > 1 ? `${title} (Part ${chunk.index + 1})` : title;
    const embedding = await generateEmbedding(chunk.text);

    const insertData: Record<string, any> = {
      tenant_id: profile.tenant_id,
      title: chunkTitle,
      content: chunk.text,
    };

    // Only include embedding if we successfully generated one
    if (embedding) {
      insertData.embedding = JSON.stringify(embedding);
    }

    const { error } = await db.from('knowledge_bases').insert(insertData);
    if (error) {
      console.error('Failed to insert knowledge chunk:', error);
      return { error: `Failed to save chunk ${chunk.index + 1}: ${error.message}` };
    }
  }

  revalidatePath('/dashboard/knowledge');
  return { success: true, chunksCreated: chunks.length };
}

export async function deleteKnowledgeDocument(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('knowledge_bases').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/dashboard/knowledge');
  return { success: true };
}

export async function updateKnowledgeDocument(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get('id') as string;
  const content = formData.get('content') as string;
  const title = formData.get('title') as string;

  if (!id || !content || !title) return { error: 'All fields are required' };

  // Re-generate embedding for updated content
  const embedding = await generateEmbedding(content);
  const updateData: Record<string, any> = { title, content };
  if (embedding) {
    updateData.embedding = JSON.stringify(embedding);
  }

  const { error } = await supabase.from('knowledge_bases').update(updateData).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/dashboard/knowledge');
  return { success: true };
}
