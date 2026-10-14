import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createDemandComment, getDemandById } from "@/lib/repositories/demandRepository";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  let body: { conteudo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (typeof body.conteudo !== "string" || !body.conteudo.trim() || body.conteudo.trim().length > 5000) {
    return NextResponse.json({ error: "O comentário é obrigatório e deve ter até 5.000 caracteres." }, { status: 400 });
  }

  const result = await createDemandComment(params.id, session.id, body.conteudo.trim(), session.perfil === "SUPORTE");
  if (!result) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });
  const demand = await getDemandById(params.id);
  if (!demand) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });
  return NextResponse.json({ demand }, { status: 201 });
}