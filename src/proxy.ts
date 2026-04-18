import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for SEO redirects ONLY (not for auth)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Rotas que requerem autenticação
const isProtectedRoute = createRouteMatcher([
  '/musics/create(.*)',
  '/musics/edit(.*)',
  '/playlists/create(.*)',
  '/playlists/edit(.*)',
  '/starred-songs(.*)',
  '/users/edit(.*)',
  '/users/profile(.*)',
]);

// Rotas admin (requerem role ADMIN ou REVIEWER)
const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/logs(.*)',
]);

// Rotas exclusivas para ADMIN (não REVIEWER)
const isAdminOnlyRoute = createRouteMatcher([
  '/admin/dashboard(.*)',
]);

// Rotas públicas de auth (não redirecionar se já autenticado)
const isAuthRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/login(.*)',
  '/register(.*)',
]);

export default clerkMiddleware(async (auth, req: NextRequest) => {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  /**
   * NOTE: Role-based access control should work like this:
   * 
   * 1. User signs up/logs in
   * 2. Your API endpoint (/api/webhooks/clerk or /api/auth/setup) fetches role from DB
   * 3. Update Clerk's publicMetadata with: { role: 'ADMIN' | 'REVIEWER' | 'USER' | 'TRUSTED' }
   * 4. In proxy (THIS FILE): Read role from sessionClaims.metadata (instant, no DB query)
   * 5. Redirect based on that role
   * 
   * NEVER fetch roles from DB in proxy - it will timeout on Vercel!
   */

  // ==========================================
  // REDIRECIONAMENTO SEO - MÚSICAS PARA SLUG
  // ==========================================
  if (supabase && pathname.startsWith('/musics/') && !pathname.includes('/create') && !pathname.includes('/edit')) {
    const musicId = pathname.split('/musics/')[1];

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const cuidRegex = /^c[a-z0-9]{24}$/;

    if (uuidRegex.test(musicId) || cuidRegex.test(musicId)) {
      try {
        const { data: song, error } = await supabase
          .from('Song')
          .select('id, slug')
          .eq('id', musicId)
          .single();

        if (!error && song && song.slug) {
          url.pathname = `/musics/${song.slug}`;
          return NextResponse.redirect(url, 301);
        }
      } catch (error) {
        // Continuar sem redirecionar em caso de erro
        console.debug('[PROXY] SEO redirect failed:', error);
      }
    }
  }

  // ==========================================
  // VERIFICAÇÕES DE AUTENTICAÇÃO CLERK
  // ==========================================

  const { userId, sessionClaims } = await auth();

  // IMPORTANTE: Apenas usar dados do JWT, nunca fazer queries no proxy!
  // O role deve ser atualizado na metadata do Clerk durante login/signup
  const userRole = (sessionClaims?.metadata as { role?: string })?.role;
  const isBanned = (sessionClaims?.metadata as { isBanned?: boolean })?.isBanned;

  // Se não temos role nas claims, o utilizador ainda não fez login
  // (não tentar buscar do Supabase - isso causaria timeout)

  // Verificar se utilizador está banido
  if (userId && isBanned && !pathname.startsWith('/banned')) {
    url.pathname = '/banned';
    return NextResponse.redirect(url);
  }

  // Redirecionar utilizadores autenticados que acedem a páginas de auth
  if (userId && isAuthRoute(req)) {
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Proteger rotas admin
  if (isAdminRoute(req)) {
    if (!userId) {
      url.pathname = '/sign-in';
      url.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(url);
    }

    // Verificar role ADMIN ou REVIEWER
    // Se userRole for undefined (JWT sem metadata), deixar passar — o layout faz o check via DB
    if (userRole && userRole !== 'ADMIN' && userRole !== 'REVIEWER') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Rotas exclusivas ADMIN
    if (isAdminOnlyRoute(req) && userRole && userRole !== 'ADMIN') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // Proteger rotas que requerem autenticação
  if (isProtectedRoute(req)) {
    if (!userId) {
      url.pathname = '/sign-in';
      url.searchParams.set('redirect_url', pathname);
      return NextResponse.redirect(url);
    }
  }

  // ==========================================
  // HEADERS SEO
  // ==========================================
  const response = NextResponse.next();

  if (pathname.startsWith('/musics/') || pathname === '/musics' || pathname === '/') {
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    response.headers.set('X-Robots-Tag', 'index, follow, max-image-preview:large, max-snippet:-1');
  }

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
