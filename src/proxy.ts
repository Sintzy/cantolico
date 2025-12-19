import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createClient } from '@supabase/supabase-js';
import {
  logUnauthorizedAccess,
  logForbiddenAccess,
} from "@/lib/middleware-logging";
import { runWithCorrelationContextAsync, createCorrelationContext } from "@/lib/correlation-context";
import { logger } from "@/lib/logger";
import { LogCategory } from "@/types/logging";

// Create Supabase client for middleware
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function proxy(req: NextRequest) {
  const startTime = Date.now();
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  const context = createCorrelationContext({
    ip_address: ipAddress,
    user_agent: userAgent,
  });
  
  return runWithCorrelationContextAsync(context, async () => {
    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    const method = req.method;
    
    // Tentar obter token do usuário (sem bloquear)
    let token: any = null;
    try {
      token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    } catch (error) {
      // Ignorar erros de token
    }

    // Log requisição importante (APIs, admin, ações de criação)
    const shouldLog = 
      pathname.startsWith('/api/') || 
      pathname.startsWith('/admin') ||
      pathname.startsWith('/musics/create') ||
      pathname.startsWith('/playlists/create') ||
      method !== 'GET';

    if (shouldLog) {
      logger.debug(`${method} ${pathname}`, {
        category: LogCategory.HTTP,
        tags: ['http-request', method.toLowerCase()],
        user: token ? {
          user_id: token.sub || token.id,
          user_email: token.email,
          user_name: token.name,
          user_role: token.role,
        } : undefined,
        network: {
          ip_address: ipAddress,
          user_agent: userAgent.substring(0, 200),
        },
        http: {
          method: method as any,
          url: pathname + url.search,
        },
      });
    }
    
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
  
  // Log resposta para requisições importantes ou lentas
  const endTime = Date.now();
  const responseTime = endTime - startTime;
  
  if (shouldLog || responseTime > 3000) {
    const statusCode = response.status;
    
    logger.debug(`${method} ${pathname} - ${statusCode} (${responseTime}ms)`, {
      category: LogCategory.HTTP,
      tags: ['http-response', method.toLowerCase(), `status-${statusCode}`],
      user: token ? {
        user_id: token.sub || token.id,
        user_email: token.email,
      } : undefined,
      network: {
        ip_address: ipAddress,
      },
      http: {
        method: method as any,
        url: pathname + url.search,
        status_code: statusCode,
        response_time_ms: responseTime,
      },
      performance: {
        response_time_ms: responseTime,
        is_slow: responseTime > 3000,
      },
    });
  }
  
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
