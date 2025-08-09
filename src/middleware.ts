import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

type Token = {
  id?: string;
  role?: string;
};

export async function middleware(req: NextRequest) {
  const token = (await getToken({ req })) as Token;
  const pathname = req.nextUrl.pathname;

  // Verificar se o utilizador está banido ou suspenso (apenas se autenticado)
  if (token?.id) {
    try {
      const userModeration = await prisma.userModeration.findUnique({
        where: { userId: parseInt(token.id) },
        select: { status: true, expiresAt: true }
      });

      if (userModeration) {
        const now = new Date();
        
        // Verificar se está banido
        if (userModeration.status === 'BANNED') {
          const url = req.nextUrl.clone();
          url.pathname = "/login";
          url.searchParams.set("message", "A sua conta foi banida.");
          return NextResponse.redirect(url);
        }
        
        // Verificar se está suspenso e se a suspensão ainda está ativa
        if (userModeration.status === 'SUSPENDED') {
          if (!userModeration.expiresAt || userModeration.expiresAt > now) {
            const url = req.nextUrl.clone();
            url.pathname = "/login";
            url.searchParams.set("message", "A sua conta está suspensa.");
            return NextResponse.redirect(url);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao verificar moderação do utilizador:', error);
    }
  }

  // rotas publicas sem auth
  const publicRoutes = ["/", "/musics", "/music/[id]", "/profile/[id]"];
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // rotas com auth
  const userRoutes = ["/musics/create"];
  if (userRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("message", "Precisas de estar autenticado para acessar esta área!");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // rotas de admin
  const adminRoutes = ["/admin/dashboard"];
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (!token || token.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("message", "Não tens permissão para acessar a área de administração!");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // rotas de reviwer
  const reviewerRoutes = ["/admin/review", "/admin/review/[id]"];
  if (reviewerRoutes.some((route) => pathname.startsWith(route))) {
    if (!token || !["REVIEWER", "ADMIN"].includes(token.role || "")) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("message", "Não tens permissão para acessar esta área!");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // default
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("message", "Precisas de estar autenticado para acessar esta área!");
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/musics/create",
    "/admin/dashboard/:path*",
    "/admin/review/:path*",
    "/playlists/:path*",
    "/users/:path*",
    "/profile/:path*",
  ],
};