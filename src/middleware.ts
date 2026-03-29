import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for middleware
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cache para roles (evita múltiplas queries por request)
const roleCache = new Map<string, { role: string; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minuto

// Atualiza metadata no Clerk de forma assíncrona (não bloqueia o request)
async function updateClerkMetadataAsync(clerkUserId: string, role: string): Promise<void> {
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { role },
    });
  } catch (error) {
    console.error('[MIDDLEWARE] Erro ao atualizar metadata Clerk:', error);
  }
}

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

  // ==========================================
  // REDIRECIONAMENTO SEO - MÚSICAS PARA SLUG
  // ==========================================
  if (pathname.startsWith('/musics/') && !pathname.includes('/create') && !pathname.includes('/edit')) {
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
      }
    }
  }

  // ==========================================
  // VERIFICAÇÕES DE AUTENTICAÇÃO CLERK
  // ==========================================

  const { userId, sessionClaims } = await auth();

  // Tentar obter role das sessionClaims primeiro, senão do Supabase
  let userRole = (sessionClaims?.metadata as { role?: string })?.role;
  let isBanned = (sessionClaims?.metadata as { isBanned?: boolean })?.isBanned;

  // Se temos userId mas não temos role nas claims, buscar do Supabase
  if (userId && !userRole) {
    // Verificar cache primeiro
    const cached = roleCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      userRole = cached.role;
    } else {
      // Buscar do Supabase pelo clerkUserId
      const { data: user } = await supabase
        .from('User')
        .select('role')
        .eq('clerkUserId', userId)
        .single();

      if (user?.role) {
        userRole = user.role;
        roleCache.set(userId, { role: user.role, timestamp: Date.now() });

        // Atualizar metadata no Clerk para próximas requests (async, não bloqueia)
        updateClerkMetadataAsync(userId, user.role);
      }
    }
  }

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
    if (userRole !== 'ADMIN' && userRole !== 'REVIEWER') {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Rotas exclusivas ADMIN
    if (isAdminOnlyRoute(req) && userRole !== 'ADMIN') {
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
