import { NextRequest, NextResponse } from "next/server";
import { verifyEdgeSession } from "@/lib/auth/edgeSession";

const SESSION_COOKIE = "demandas_session";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const session = await verifyEdgeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (!session && (pathname.startsWith("/demands") || pathname.startsWith("/admin") || pathname.startsWith("/clients") || pathname.startsWith("/api/demands") || pathname.startsWith("/api/users") || pathname.startsWith("/api/clients") || pathname.startsWith("/api/attachments") || pathname === "/api/auth/me")) {
    if (isApi) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && pathname === "/login") return NextResponse.redirect(new URL("/demands", request.url));
  if (session && pathname === "/demands/new" && !["SUPORTE", "ADM"].includes(session.perfil)) {
    return NextResponse.redirect(new URL("/demands", request.url));
  }
  if (session && pathname === "/api/demands" && request.method === "POST" && !["SUPORTE", "ADM"].includes(session.perfil)) {
    return isApi ? NextResponse.json({ error: "Sem permissão." }, { status: 403 }) : NextResponse.redirect(new URL("/demands", request.url));
  }
  if (session && pathname.startsWith("/admin") && session.perfil !== "ADM") {
    return isApi ? NextResponse.json({ error: "Sem permissão." }, { status: 403 }) : NextResponse.redirect(new URL("/demands", request.url));
  }
  if (session && pathname.startsWith("/clients") && session.perfil !== "ADM") return NextResponse.redirect(new URL("/demands", request.url));
  if (session && pathname.startsWith("/api/clients") && request.method !== "GET" && session.perfil !== "ADM") {
    return NextResponse.json({ error: "Apenas ADM pode gerenciar clientes." }, { status: 403 });
  }
  if (session && pathname.startsWith("/api/users") && session.perfil !== "ADM") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  if (session && pathname.startsWith("/api/demands/") && request.method === "PATCH" && !["DEV", "ADM"].includes(session.perfil)) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/demands/:path*", "/admin/:path*", "/clients/:path*", "/api/auth/me", "/api/demands/:path*", "/api/users/:path*", "/api/clients/:path*", "/api/attachments/:path*"],
};