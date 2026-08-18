import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/signup', '/auth/callback', '/suspended'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // API webhook routes are public (verified by their own secrets)
  const isWebhookRoute = pathname.startsWith('/api/webhooks');

  // Protected route prefixes that require authentication
  const protectedPrefixes = ['/dashboard', '/super-admin'];
  const isProtectedRoute = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isPublicRoute || isWebhookRoute) {
    return supabaseResponse;
  }

  // For non-protected routes (CMS public pages, homepage, etc.), allow through
  if (!isProtectedRoute) {
    return supabaseResponse;
  }

  // No user → redirect to login (only for protected routes)
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // Use service role client to bypass RLS for role lookup
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: profile } = await serviceClient
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  // Check tenant suspension for non-super-admin dashboard users
  if (pathname.startsWith('/dashboard') && profile?.tenant_id && profile?.role !== 'super_admin') {
    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('is_suspended')
      .eq('id', profile.tenant_id)
      .single();

    if (tenant?.is_suspended) {
      const url = request.nextUrl.clone();
      url.pathname = '/suspended';
      return NextResponse.redirect(url);
    }
  }

  // For /super-admin routes, verify user has super_admin role
  if (pathname.startsWith('/super-admin')) {
    if (profile?.role !== 'super_admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Super admin users accessing /dashboard should be redirected to /super-admin
  if (pathname.startsWith('/dashboard') && profile?.role === 'super_admin') {
    const url = request.nextUrl.clone();
    url.pathname = '/super-admin';
    return NextResponse.redirect(url);
  }

  // Redirect new tenants with 0 workspaces to onboarding (skip if already on onboarding)
  if (
    pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/dashboard/onboarding') &&
    profile?.tenant_id &&
    profile?.role !== 'super_admin'
  ) {
    const { count } = await serviceClient
      .from('workspaces')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id);

    if (count === 0) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard/onboarding';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
