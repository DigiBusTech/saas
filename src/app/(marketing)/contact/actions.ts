'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const contactSchema = z.object({
  name: z.string().min(2, 'Please enter your name').max(120),
  email: z.string().email('Enter a valid email address'),
  company: z.string().max(160).optional(),
  message: z.string().min(10, 'Tell us a bit more (10+ characters)').max(4000),
});

export async function submitContactMessage(formData: FormData) {
  const raw = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
    company: (formData.get('company') as string) || undefined,
    message: formData.get('message') as string,
  };

  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Public-facing form — use the service client since the visitor is unauthenticated
  // and RLS only allows INSERT (not read) for the anon role on this table.
  const db = createServiceClient();
  const { error } = await db.from('contact_messages').insert({
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company ?? null,
    message: parsed.data.message,
  });

  if (error) return { error: 'Something went wrong sending your message. Please try again.' };
  return { success: true };
}
