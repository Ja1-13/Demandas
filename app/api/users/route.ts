import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createUser, listUsers } from "@/lib/repositories/userRepository";
import { PERFIS } from "@/lib/types";
import type { Perfil } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.perfil !== "ADM") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  return NextResponse.json(await listUsers());
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.perfil !== "ADM") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  let body: { username?: unknown; name?: unknown; password?: unknown; perfil?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) return NextResponse.json({ error: "Usuário deve ter 3 a 40 caracteres (letras, números, ponto, hífen ou sublinhado)." }, { status: 400 });
  if (name.length < 2 || name.length > 100) return NextResponse.json({ error: "Informe um nome entre 2 e 100 caracteres." }, { status: 400 });
  if (password.length < 8 || password.length > 200) return NextResponse.json({ error: "A senha deve ter pelo menos 8 caracteres." }, { status: 400 });
  if (!PERFIS.includes(body.perfil as Perfil)) return NextResponse.json({ error: "Perfil inválido." }, { status: 400 });
  try {
    return NextResponse.json(await createUser({ username, name, password, perfil: body.perfil as Perfil }), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "USERNAME_EXISTS") return NextResponse.json({ error: "Esse nome de usuário já está em uso." }, { status: 409 });
    throw error;
  }
}