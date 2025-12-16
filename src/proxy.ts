import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createClient } from '@supabase/supabase-js';
import {
  logUnauthorizedAccess,
  logForbiddenAccess,
} from "@/lib/middleware-logging";
import { runWithCorrelationContextAsync, createCorrelationContext } from "@/lib/correlation-context";

// Create Supabase client for middleware
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function proxy(req: NextRequest) {
  const context = createCorrelationContext({
    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown',
  });
  
  return runWithCorrelationContextAsync(context, async () => {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    
    // ==========================================
    // REDIRECIONAMENTO SEO - MÚSICAS PARA SLUG
    // ==========================================
    // Redirecionar /musics/[uuid] para /musics/[slug] se slug existir
    // Isto evita conteúdo duplicado e melhora SEO
    if (pathname.startsWith('/musics/') && !pathname.includes('/create')) {
      const musicId = pathname.split('/musics/')[1];
      
      // Verificar se parece com um UUID (36 caracteres com hífens)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const cuidRegex = /^c[a-z0-9]{24}$/; // CUID format
      
      if (uuidRegex.test(musicId) || cuidRegex.test(musicId)) {
        try {
          const { data: song, error } = await supabase
            .from('Song')
            .select('id, slug')
            .eq('id', musicId)
            .single();
            
          if (!error && song && song.slug) {
            url.pathname = `/musics/${song.slug}`;
            return NextResponse.redirect(url, 301); // Redirect permanente para SEO
          }
        } catch (error) {
          // Continuar sem redirecionar em caso de erro
        }
      }
    }
  
  // ==========================================
  // VERIFICAÇÕES DE AUTENTICAÇÃO
  // ==========================================
  
  // Páginas que não precisam de verificação de email
  const emailVerificationExemptPaths = [
    '/login',
    '/register', 
    '/auth/confirm-email',
    '/privacy-policy',
    '/terms',
    '/banned'
  ];
  
  // Verificar se o path está isento da verificação de email
  const isExemptFromEmailVerification = emailVerificationExemptPaths.some(path => 
    pathname.startsWith(path)
  );
  
  // Verificar acesso a áreas protegidas
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.sub) {
      logUnauthorizedAccess({
        user: { user_email: 'unknown' },
        network: { ip_address: context.ip_address, user_agent: context.user_agent },
        resource: pathname,
        details: { reason: 'No authentication token' },
      });
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // Se token não tem role, buscar na BD
    let userRole = token.role;
    let emailVerified = token.emailVerified;
    
    if ((!userRole || emailVerified === undefined) && token.sub) {
      try {
        const { data: user, error } = await supabase
          .from('User')
          .select('role, emailVerified')
          .eq('id', Number(token.sub))
          .single();
          
        if (!error && user) {
          userRole = user.role;
          emailVerified = user.emailVerified;
        }
      } catch (error) {
        // Silently handle database errors
      }
    }
    
    // Verificar se email está verificado (exceto para logout)
    if (!emailVerified && !pathname.includes('/api/auth/signout')) {
      // Verificar se é conta OAuth e corrigir automaticamente
      try {
        const { data: oauthAccount, error: accountError } = await supabase
          .from('Account')
          .select('provider')
          .eq('userId', Number(token.sub))
          .eq('provider', 'google')
          .single();
        
        if (!accountError && oauthAccount) {
          console.log(`� [MIDDLEWARE] Auto-corrigindo conta OAuth admin para utilizador ${token.sub}...`);
          
          // Corrigir emailVerified automaticamente
          const { error: updateError } = await supabase
            .from('User')
            .update({
              emailVerified: new Date().toISOString()
            })
            .eq('id', Number(token.sub));
          
          if (!updateError) {
            console.log(`✅ [MIDDLEWARE] Email auto-verificado para admin OAuth ${token.sub}`);
            emailVerified = true; // Permitir acesso imediato
          }
        }
      } catch (error) {
        console.log(`❌ [MIDDLEWARE] Erro ao corrigir OAuth admin:`, error);
      }
      
      if (!emailVerified) {
        logForbiddenAccess({
            user: { user_id: token.sub, user_email: token.email || undefined },
          network: { ip_address: context.ip_address, user_agent: context.user_agent },
          resource: pathname,
          required_role: 'email_verified',
          details: { reason: 'Email not verified for admin access' },
        });
        url.pathname = '/';
        url.searchParams.set('message', 'email-verification-required');
        return NextResponse.redirect(url);
      }
    }
    
    // Verificar se tem permissões de ADMIN ou REVIEWER para áreas protegidas
    if (userRole !== 'ADMIN' && userRole !== 'REVIEWER') {
      logForbiddenAccess({
        user: { user_id: token.sub, user_email: token.email || undefined, user_role: userRole },
        network: { ip_address: context.ip_address, user_agent: context.user_agent },
        resource: pathname,
        required_role: 'ADMIN or REVIEWER',
        details: { current_role: userRole },
      });
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    
    // Para certas rotas admin, restringir apenas a ADMIN (dashboard, users, etc.)
    const adminOnlyPaths = ['/admin/dashboard'];
    const isAdminOnlyPath = adminOnlyPaths.some(path => pathname.startsWith(path));
    
    if (isAdminOnlyPath && userRole !== 'ADMIN') {
      logForbiddenAccess({
        user: { user_id: token.sub, user_email: token.email || undefined, user_role: userRole },
        network: { ip_address: context.ip_address, user_agent: context.user_agent },
        resource: pathname,
        required_role: 'ADMIN',
        details: { current_role: userRole },
      });
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }
  
  // Verificar acesso a páginas que requerem conta verificada
  const protectedPaths = [
    '/musics/create',
    '/musics/edit',
    '/playlists/create',
    '/playlists/edit',
    '/starred-songs',
    '/users/edit',
    '/users/profile'
  ];
  
  const requiresEmailVerification = protectedPaths.some(path => 
    pathname.startsWith(path)
  ) || (pathname.startsWith('/users/') && !pathname.includes('/users/['));
  
  // Verificar se precisa de verificação de email para paths protegidos
  if (requiresEmailVerification && !isExemptFromEmailVerification) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.sub) {
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // Verificar se email está verificado
    let emailVerified = token.emailVerified;
    
    if (emailVerified === undefined && token.sub) {
      try {
        const { data: user, error } = await supabase
          .from('User')
          .select('emailVerified')
          .eq('id', Number(token.sub))
          .single();
          
        if (!error && user) {
          emailVerified = user.emailVerified;
        }
      } catch (error) {
        console.log(`❌ [MIDDLEWARE] Erro ao verificar emailVerified:`, error);
      }
    }
    
    // Se email não verificado, verificar se é conta OAuth e corrigir automaticamente
    if (!emailVerified && token.sub) {
      try {
        // Verificar se tem conta OAuth (Google)
        const { data: oauthAccount, error: accountError } = await supabase
          .from('Account')
          .select('provider')
          .eq('userId', Number(token.sub))
          .eq('provider', 'google')
          .single();
        
        if (!accountError && oauthAccount) {
          console.log(`🔧 [MIDDLEWARE] Auto-corrigindo conta OAuth para utilizador ${token.sub}...`);
          
          // Corrigir emailVerified automaticamente
          const { error: updateError } = await supabase
            .from('User')
            .update({
              emailVerified: new Date().toISOString()
            })
            .eq('id', Number(token.sub));
          
          if (!updateError) {
            console.log(`✅ [MIDDLEWARE] Email auto-verificado para conta OAuth ${token.sub}`);
            emailVerified = true; // Permitir acesso imediato
          }
        }
      } catch (error) {
        console.log(`❌ [MIDDLEWARE] Erro ao corrigir OAuth:`, error);
      }
    }

    if (!emailVerified) {
      console.log(`🚨 [MIDDLEWARE] Acesso negado - email não verificado: ${pathname}`);
      url.pathname = '/';
      url.searchParams.set('message', 'email-verification-required');
      return NextResponse.redirect(url);
    }
  }

  // Verificar acesso a logs (apenas admin)
  if (pathname.startsWith('/logs')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.sub) {
      logUnauthorizedAccess({
        user: { user_email: 'unknown' },
        network: { ip_address: context.ip_address, user_agent: context.user_agent },
        resource: pathname,
        details: { reason: 'No authentication token for logs access' },
      });
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // Se token não tem role, buscar na BD
    let userRole = token.role;
    let emailVerified = token.emailVerified;
    
    if ((!userRole || emailVerified === undefined) && token.sub) {
      try {
        const { data: user, error } = await supabase
          .from('User')
          .select('role, emailVerified')
          .eq('id', Number(token.sub))
          .single();
          
        if (!error && user) {
          userRole = user.role;
          emailVerified = user.emailVerified;
        }
      } catch (error) {
        console.log(`❌ [MIDDLEWARE] Erro ao verificar role para logs:`, error);
      }
    }
    
    // Verificar se email está verificado
    if (!emailVerified) {
      logForbiddenAccess({
        user: { user_id: token.sub, user_email: token.email || undefined },
        network: { ip_address: context.ip_address, user_agent: context.user_agent },
        resource: pathname,
        required_role: 'email_verified',
        details: { reason: 'Email not verified for logs access' },
      });
      url.pathname = '/';
      url.searchParams.set('message', 'email-verification-required');
      return NextResponse.redirect(url);
    }
    
    if (userRole !== 'ADMIN') {
      logForbiddenAccess({
        user: { user_id: token.sub, user_email: token.email || undefined, user_role: userRole },
        network: { ip_address: context.ip_address, user_agent: context.user_agent },
        resource: pathname,
        required_role: 'ADMIN',
        details: { current_role: userRole, reason: 'Insufficient permissions for logs access' },
      });
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  // ==========================================
  // HEADERS SEO AGRESSIVOS
  // ==========================================
  const response = NextResponse.next();
  
  // Headers para melhorar SEO e indexação
  if (pathname.startsWith('/musics/') || pathname === '/musics' || pathname === '/') {
    // Páginas de conteúdo - máxima crawlabilidade
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');
    response.headers.set('X-Robots-Tag', 'index, follow, max-image-preview:large, max-snippet:-1');
  }
  
  // Headers globais para SEO
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - api/banners (public banner endpoints)
     * - api/musics (public music endpoints)
     * - api/playlists (public playlist endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login, register (auth pages)
     * - auth/confirm-email (email verification page)
     */
    "/((?!api/auth|api/banners|api/musics|api/playlists|_next/static|_next/image|favicon.ico|login|register|auth/confirm-email).*)",
  ],
};
