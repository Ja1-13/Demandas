import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createClient, listClients } from "@/lib/repositories/clientRepository";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const clients = await listClients();
  return NextResponse.json(session.perfil === "ADM" ? clients : clients.map(({ id, nome }) => ({ id, nome })));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.perfil !== "ADM") return NextResponse.json({ error: "Apenas ADM pode cadastrar clientes." }, { status: 403 });
  let body: { nome?: unknown; contato?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  const contato = typeof body.contato === "string" ? body.contato.trim() : "";
  if (!nome || nome.length > 160) return NextResponse.json({ error: "Informe o nome do cliente (até 160 caracteres)." }, { status: 400 });
  if (contato.length > 240) return NextResponse.json({ error: "O contato deve ter até 240 caracteres." }, { status: 400 });
  try {
    return NextResponse.json(await createClient({ nome, contato }), { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CLIENT_NAME_EXISTS") return NextResponse.json({ error: "Já existe um cliente com esse nome." }, { status: 409 });
    throw error;
  }
}