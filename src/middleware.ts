import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

type Token = {
  role?: string;
};

export async function middleware(req: NextRequest) {
  const token = (await getToken({ req })) as Token;
  const pathname = req.nextUrl.pathname;

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
  ],
};