import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { attachLegacyDemandsToClient, hasClientDemands } from "@/lib/repositories/demandRepository";
import { deleteClient, findClientById, updateClient } from "@/lib/repositories/clientRepository";
import { withDataLock } from "@/lib/server/jsonStore";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.perfil !== "ADM") return NextResponse.json({ error: "Apenas ADM pode editar clientes." }, { status: 403 });
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
  return withDataLock(async () => {
    const current = await findClientById(params.id);
    if (!current) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    await attachLegacyDemandsToClient(current);
    const client = await updateClient(params.id, { nome, contato });
    if (!client) return NextResponse.json({ error: "Já existe um cliente com esse nome." }, { status: 409 });
    return NextResponse.json(client);
  });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.perfil !== "ADM") return NextResponse.json({ error: "Apenas ADM pode excluir clientes." }, { status: 403 });
  return withDataLock(async () => {
    const client = await findClientById(params.id);
    if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });
    if (await hasClientDemands(client)) return NextResponse.json({ error: "Este cliente não pode ser excluído porque possui demandas vinculadas." }, { status: 409 });
    await deleteClient(params.id);
    return NextResponse.json({ ok: true });
  });
}