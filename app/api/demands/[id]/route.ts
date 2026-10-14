import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateDemandStatus } from "@/lib/repositories/demandRepository";
import { STATUS } from "@/lib/types";
import type { Status } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!["DEV", "ADM"].includes(session.perfil)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  if (!STATUS.includes(body.status as Status)) return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  if (session.perfil === "DEV" && body.status === "Pendente") {
    return NextResponse.json({ error: "Desenvolvimento só pode avançar a demanda." }, { status: 403 });
  }
  const demand = await updateDemandStatus(params.id, body.status as Status);
  if (!demand) return NextResponse.json({ error: "Demanda não encontrada." }, { status: 404 });
  return NextResponse.json(demand);
}