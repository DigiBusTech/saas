import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';


export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — ignore
          }
        },
      },
    }
  );
}

/**
 * Service-role (admin) client for server-only operations that bypass RLS.
 *
 * IMPORTANT: This uses the raw `@supabase/supabase-js` client rather than the
 * SSR cookie-based client. The SSR client attaches the browser's auth context,
 * which caused the Super Admin `/super-admin/tenants` page to return 0 rows
 * because RLS was still being evaluated against the anon/user session. Using the
 * plain client with the SERVICE_ROLE_KEY and no session persistence guarantees
 * RLS is fully bypassed so all tenants are returned.
 *
 * NEVER expose this to the browser.
 */
import { env } from '@/lib/env';

/**
 * Service-role (admin) client for server‑only operations that bypass RLS.
 *
 * The service role key is optional in local development – if it is not
 * provided we fall back to the anon public key and log a warning. This
 * allows the admin UI (Tenants, AI Providers, Observability, etc.) to work
 * in a sandbox without exposing a real service key.
 */
export function createServiceClient() {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    // eslint-disable-next-line no-console
    console.warn(
      '[supabase] SUPABASE_SERVICE_ROLE_KEY not set – falling back to anon key. RLS will be enforced, which may hide data in admin views.'
    );
  }
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serviceKey ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}


