import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { findUserByUsername } from "@/lib/repositories/userRepository";

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!body.username || !body.password || body.username.length > 100 || body.password.length > 200) {
    return NextResponse.json({ error: "Informe usuário e senha." }, { status: 400 });
  }
  const user = await findUserByUsername(body.username);
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }
  const token = await createSessionToken({ id: user.id, username: user.username, name: user.name, perfil: user.perfil });
  const response = NextResponse.json({ id: user.id, username: user.username, name: user.name, perfil: user.perfil });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}