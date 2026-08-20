'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getWorkspaceProducts(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspace_products')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function createProduct(workspaceId: string, formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = parseFloat(formData.get('price') as string);
  const currency = (formData.get('currency') as string) || 'USD';
  const imageUrl = formData.get('image_url') as string;
  const paymentLink = formData.get('payment_link') as string;
  const code = (formData.get('code') as string)?.trim();
  const checkoutUrl = formData.get('checkout_url') as string;
  const isActive = formData.get('is_active') !== 'false';

  if (!name || isNaN(price)) return { error: 'Name and valid price are required' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_products')
    .insert({
      workspace_id: workspaceId,
      name,
      description: description || null,
      price,
      currency,
      image_url: imageUrl || null,
      payment_link: paymentLink || null,
      code: code || null,
      checkout_url: checkoutUrl || null,
      is_active: isActive,
    });

  if (error) return { error: error.code === '23505' ? 'That product code is already in use.' : error.message };

  revalidatePath(`/dashboard/${workspaceId}/products`);
  return { error: null };
}

export async function updateProduct(productId: string, workspaceId: string, formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const price = parseFloat(formData.get('price') as string);
  const currency = (formData.get('currency') as string) || 'USD';
  const imageUrl = formData.get('image_url') as string;
  const paymentLink = formData.get('payment_link') as string;
  const code = (formData.get('code') as string)?.trim();
  const checkoutUrl = formData.get('checkout_url') as string;
  const isActive = formData.get('is_active') !== 'false';

  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_products')
    .update({
      name,
      description: description || null,
      price,
      currency,
      image_url: imageUrl || null,
      payment_link: paymentLink || null,
      code: code || null,
      checkout_url: checkoutUrl || null,
      is_active: isActive,
    })
    .eq('id', productId);

  if (error) return { error: error.code === '23505' ? 'That product code is already in use.' : error.message };

  revalidatePath(`/dashboard/${workspaceId}/products`);
  return { error: null };
}

export async function deleteProduct(productId: string, workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_products')
    .delete()
    .eq('id', productId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/products`);
  return { error: null };
}
