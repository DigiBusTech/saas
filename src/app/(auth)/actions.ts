'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { loginSchema, signupSchema } from '@/lib/schemas';
import { sendEmail } from '@/lib/email';

export async function login(formData: FormData) {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  // Check role to decide redirect target — use service client to bypass RLS
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const svc = createServiceClient();
    const { data: profile } = await svc
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'super_admin') {
      redirect('/super-admin');
    }
  }

  redirect('/dashboard');
}

export async function signup(formData: FormData) {
  const raw = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    fullName: formData.get('fullName') as string,
    tenantName: formData.get('tenantName') as string,
    acceptedTerms: formData.get('acceptedTerms') as string,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const serviceClient = createServiceClient();

  // 1. Create the tenant first
  const { data: tenant, error: tenantError } = await serviceClient
    .from('tenants')
    .insert({ name: parsed.data.tenantName })
    .select()
    .single();

  if (tenantError || !tenant) {
    return { error: 'Failed to create business account. Please try again.' };
  }

  // 2. Sign up the user with the tenant_id in metadata
  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        role: 'tenant_admin',
        tenant_id: tenant.id,
        accepted_terms_at: new Date().toISOString(),
      },
    },
  });

  if (authError) {
    // Rollback tenant creation
    await serviceClient.from('tenants').delete().eq('id', tenant.id);
    return { error: authError.message };
  }

  // Fire-and-forget welcome email — never block signup on SMTP issues.
  sendEmail('welcome_tenant', parsed.data.email, {
    platform_name: 'SabiBio',
    tenant_name: parsed.data.tenantName,
  }).catch((err) => console.error('[signup] Welcome email failed:', err));

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
