import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

const schema = z.object({ workspaceId: z.string().uuid() });

export async function POST(request: Request) {
  const form = await request.formData();
  const parsed = schema.safeParse({ workspaceId: form.get('workspaceId') });
  const file = form.get('file');
  if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: 'Receipt file is required' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024 || !file.type.startsWith('image/') && file.type !== 'application/pdf') return NextResponse.json({ error: 'Receipt must be an image or PDF under 8 MB' }, { status: 400 });
  const db = createServiceClient();
  const { data: workspace } = await db.from('workspaces').select('id').eq('id', parsed.data.workspaceId).eq('is_active', true).single();
  if (!workspace) return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const path = `${parsed.data.workspaceId}/${crypto.randomUUID()}.${extension}`;
  const storage = db.storage.from('checkout-receipts');
  const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data: signed, error: signedError } = await storage.createSignedUrl(path, 60 * 60 * 24 * 30);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: 'Could not create receipt link' }, { status: 500 });
  return NextResponse.json({ url: signed.signedUrl });
}
