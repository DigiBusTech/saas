'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

// Reviews Actions
export async function createReview(formData: FormData) {
  await requireSuperAdmin();
  const db = createServiceClient();
  
  const { error } = await db.from('platform_reviews').insert({
    author_name: formData.get('author_name') as string,
    author_title: formData.get('author_title') as string || null,
    company_name: formData.get('company_name') as string || null,
    review_text: formData.get('review_text') as string,
    rating: parseInt(formData.get('rating') as string),
    avatar_url: formData.get('avatar_url') as string || null,
    is_published: formData.get('is_published') === 'true',
    display_order: parseInt(formData.get('display_order') as string) || 0,
  });

  if (error) return { error: error.message };
  revalidatePath('/super-admin/marketing');
  revalidatePath('/');
  return { success: true };
}

export async function updateReview(id: string, formData: FormData) {
  await requireSuperAdmin();
  const db = createServiceClient();
  
  const { error } = await db.from('platform_reviews')
    .update({
      author_name: formData.get('author_name') as string,
      author_title: formData.get('author_title') as string || null,
      company_name: formData.get('company_name') as string || null,
      review_text: formData.get('review_text') as string,
      rating: parseInt(formData.get('rating') as string),
      avatar_url: formData.get('avatar_url') as string || null,
      is_published: formData.get('is_published') === 'true',
      display_order: parseInt(formData.get('display_order') as string) || 0,
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/super-admin/marketing');
  revalidatePath('/');
  return { success: true };
}

export async function deleteReview(id: string) {
  await requireSuperAdmin();
  const db = createServiceClient();
  
  const { error } = await db.from('platform_reviews').delete().eq('id', id);
  
  if (error) return { error: error.message };
  revalidatePath('/super-admin/marketing');
  revalidatePath('/');
  return { success: true };
}

export async function toggleReviewPublished(id: string, isPublished: boolean) {
  await requireSuperAdmin();
  const db = createServiceClient();
  
  const { error } = await db.from('platform_reviews')
    .update({ is_published: isPublished })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/super-admin/marketing');
  revalidatePath('/');
  return { success: true };
}

// Partners Actions
export async function createPartner(formData: FormData) {
  await requireSuperAdmin();
  const db = createServiceClient();
  
  const { error } = await db.from('trusted_partners').insert({
    entity_name: formData.get('entity_name') as string,
    entity_type: formData.get('entity_type') as string,
    logo_url: formData.get('logo_url') as string,
    link_url: formData.get('link_url') as string || null,
    description: formData.get('description') as string || null,
    is_active: formData.get('is_active') === 'true',
    display_order: parseInt(formData.get('display_order') as string) || 0,
  });

  if (error) return { error: error.message };
  revalidatePath('/super-admin/marketing');
  revalidatePath('/');
  return { success: true };
}

export async function updatePartner(id: string, formData: FormData) {
  await requireSuperAdmin();
  const db = createServiceClient();
  
  const { error } = await db.from('trusted_partners')
    .update({
      entity_name: formData.get('entity_name') as string,
      entity_type: formData.get('entity_type') as string,
      logo_url: formData.get('logo_url') as string,
      link_url: formData.get('link_url') as string || null,
      description: formData.get('description') as string || null,
      is_active: formData.get('is_active') === 'true',
      display_order: parseInt(formData.get('display_order') as string) || 0,
    })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/super-admin/marketing');
  revalidatePath('/');
  return { success: true };
}

export async function deletePartner(id: string) {
  await requireSuperAdmin();
  const db = createServiceClient();
  
  const { error } = await db.from('trusted_partners').delete().eq('id', id);
  
  if (error) return { error: error.message };
  revalidatePath('/super-admin/marketing');
  revalidatePath('/');
  return { success: true };
}

export async function togglePartnerActive(id: string, isActive: boolean) {
  await requireSuperAdmin();
  const db = createServiceClient();
  
  const { error } = await db.from('trusted_partners')
    .update({ is_active: isActive })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/super-admin/marketing');
  revalidatePath('/');
  return { success: true };
}
