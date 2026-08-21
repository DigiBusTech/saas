'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { loginSchema, signupSchema } from '@/lib/schemas';
import { sendEmail } from '@/lib/email';
import { validateSignupEmail, extractEmailDomain } from '@/lib/security/email-check';
import { headers } from 'next/headers';

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

  const browserFingerprint = formData.get('browserFingerprint') as string | null;

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // PHASE 2: Anti-Abuse — Disposable Email Check
  const emailValidation = validateSignupEmail(parsed.data.email);
  if (!emailValidation.valid) {
    return { error: emailValidation.reason || 'Invalid email address.' };
  }

  const serviceClient = createServiceClient();

  // Extract client IP for fraud detection
  const headersList = await headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const realIp = headersList.get('x-real-ip');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';

  const emailDomain = extractEmailDomain(parsed.data.email);

  // PHASE 2: Anti-Abuse — Check if trial was already claimed from this IP/fingerprint
  let trialBlocked = false;
  try {
    const { data: abuseCheck } = await serviceClient.rpc('check_trial_abuse', {
      ip_addr: clientIp,
      fingerprint: browserFingerprint || 'unknown',
      email_domain_input: emailDomain,
    });
    trialBlocked = abuseCheck === true;
  } catch (err) {
    console.error('[signup] Trial abuse check failed:', err);
    // Fail open: allow signup if check fails
  }

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
  const { data: authData, error: authError } = await supabase.auth.signUp({
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

  if (authError || !authData.user) {
    // Rollback tenant creation
    await serviceClient.from('tenants').delete().eq('id', tenant.id);
    return { error: authError?.message || 'Failed to create account.' };
  }

  const userId = authData.user.id;

  // 3. Create a default workspace for the tenant
  const workspaceSlug = parsed.data.tenantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const now = new Date();
  const trialEndsAt = trialBlocked ? now : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

  const { data: workspace, error: workspaceError } = await serviceClient
    .from('workspaces')
    .insert({
      tenant_id: tenant.id,
      name: parsed.data.tenantName,
      slug: workspaceSlug,
      subscription_tier: 'free_trial',
      trial_ends_at: trialBlocked ? now.toISOString() : trialEndsAt.toISOString(),
      is_trial_claimed: true,
      message_limit: 200,
      messages_used: 0,
      knowledge_doc_limit: 10,
      knowledge_docs_used: 0,
      crm_lead_limit: 50,
      crm_leads_used: 0,
    })
    .select()
    .single();

  if (workspaceError || !workspace) {
    console.error('[signup] Workspace creation failed:', workspaceError);
    // Continue anyway - workspace can be created later
  }

  // 4. Record signup footprint for anti-abuse tracking
  try {
    await serviceClient.from('signup_footprints').insert({
      user_id: userId,
      tenant_id: tenant.id,
      workspace_id: workspace?.id || null,
      ip_address: clientIp,
      browser_fingerprint: browserFingerprint || null,
      email_domain: emailDomain,
      trial_claimed: !trialBlocked, // Only count as trial claim if not blocked
    });
  } catch (err) {
    console.error('[signup] Footprint logging failed:', err);
    // Non-critical, continue
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

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter a valid email address.' };
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.sabibio.link';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
  });

  // Do not disclose whether the account exists.
  if (error) console.error('[requestPasswordReset]', error.message);

  return { success: true };
}
