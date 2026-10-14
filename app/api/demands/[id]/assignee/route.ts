import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { claimDemand, getDemandById, releaseDemand } from "@/lib/repositories/demandRepository";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!["DEV", "ADM"].includes(session.perfil)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (body.action !== "claim" && body.action !== "release") {
    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  }

  const demand = body.action === "claim"
    ? await claimDemand(params.id, session.id)
    : await releaseDemand(params.id, session.id);
  if (demand) return NextResponse.json(demand);

  const current = await getDemandById(params.id);
  if (!current) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });
  if (body.action === "release" && current.responsavelId !== session.id) {
    return NextResponse.json({ error: "Somente o responsável atual pode liberar esta demanda." }, { status: 403 });
  }
  return NextResponse.json({ error: "A demanda já foi assumida por outro usuário." }, { status: 409 });
}