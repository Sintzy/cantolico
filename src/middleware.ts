import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for middleware
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  
  // Verificar acesso a áreas protegidas
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    console.log('🔍 [MIDDLEWARE] Verificando acesso admin:', { 
      pathname, 
      hasToken: !!token,
      tokenRole: token?.role,
      tokenSub: token?.sub
    });
    
    if (!token || !token.sub) {
      console.log(`🚨 Acesso negado a ${pathname} - sem autenticação`);
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // Se token não tem role, buscar na BD
    let userRole = token.role;
    if (!userRole && token.sub) {
      console.log('🔄 [MIDDLEWARE] Token sem role, buscando na BD...');
      
      try {
        const { data: user, error } = await supabase
          .from('User')
          .select('role')
          .eq('id', Number(token.sub))
          .single();
          
        if (!error && user) {
          userRole = user.role;
          console.log(`✅ [MIDDLEWARE] Role encontrado na BD: ${userRole}`);
        } else {
          console.log(`❌ [MIDDLEWARE] Erro ao buscar role na BD:`, error?.message);
        }
      } catch (error) {
        console.log(`❌ [MIDDLEWARE] Erro de conexão com BD:`, error);
      }
    }
    
    if (userRole !== 'ADMIN') {
      console.log(`🚨 Acesso negado a ${pathname} - nível insuficiente: ${userRole}`);
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    
    console.log(`✅ [MIDDLEWARE] Acesso admin autorizado para: ${pathname}`);
  }

  // Verificar acesso a logs (apenas admin)
  if (pathname.startsWith('/logs')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    if (!token || !token.sub) {
      console.log(`🚨 Tentativa de acesso a logs sem autenticação: ${pathname}`);
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
    
    // Se token não tem role, buscar na BD
    let userRole = token.role;
    if (!userRole && token.sub) {
      try {
        const { data: user, error } = await supabase
          .from('User')
          .select('role')
          .eq('id', Number(token.sub))
          .single();
          
        if (!error && user) {
          userRole = user.role;
        }
      } catch (error) {
        console.log(`❌ [MIDDLEWARE] Erro ao verificar role para logs:`, error);
      }
    }
    
    if (userRole !== 'ADMIN') {
      console.log(`🚨 Tentativa de acesso a logs com nível insuficiente: ${userRole}`);
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
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
     */
    "/((?!api/auth|api/banners|api/musics|api/playlists|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
};