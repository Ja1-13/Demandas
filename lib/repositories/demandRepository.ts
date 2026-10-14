import "server-only";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import type { Client, Demand, Prioridade, Status, Sistema, Tipo } from "@/lib/types";
import type { Prisma } from "@prisma/client";

const PRIORITY_ORDER: Record<Prioridade, number> = { Alta: 0, Média: 1, Baixa: 2 };
const demandInclude = {
  cliente: { select: { nome: true } },
  criadaPor: { select: { name: true } },
  responsavel: { select: { id: true, name: true } },
  anexos: { select: { nomeArquivo: true } },
  comentarios: {
    orderBy: { createdAt: "asc" },
    include: { autor: { select: { id: true, name: true } } },
  },
} satisfies Prisma.DemandInclude;

export async function initializeDemands(): Promise<void> {
  await prisma.demand.findFirst();
}

export interface DemandFilters {
  status?: "all" | "open" | "completed";
  sistema?: Sistema;
  tipo?: Tipo;
  responsavelId?: string;
}

type DemandRecord = Prisma.DemandGetPayload<{ include: typeof demandInclude }>;

function toDemandRecord(demand: DemandRecord): Demand {
  return {
    id: demand.id,
    numero: demand.numero,
    descricao: demand.descricao,
    prioridade: demand.prioridade as Prioridade,
    tipo: demand.tipo as Tipo,
    cliente: demand.cliente.nome,
    clienteId: demand.clienteId,
    anexos: demand.anexos.map((attachment) => attachment.nomeArquivo),
    sistema: demand.sistema as Sistema,
    status: demand.status as Status,
    criadaPor: demand.criadaPor.name,
    criadaEm: demand.criadaEm.toISOString(),
    responsavelId: demand.responsavelId,
    responsavel: demand.responsavel,
    comentarios: demand.comentarios.map((comment) => ({
      id: comment.id,
      conteudo: comment.conteudo,
      createdAt: comment.createdAt.toISOString(),
      autor: comment.autor,
    })),
  };
}

export async function listDemands(filters: DemandFilters = {}): Promise<Demand[]> {
  const where: Prisma.DemandWhereInput = {};
  if (filters.status === "open") where.status = { not: "Concluída" };
  if (filters.status === "completed") where.status = "Concluída";
  if (filters.sistema) where.sistema = filters.sistema;
  if (filters.tipo) where.tipo = filters.tipo;
  if (filters.responsavelId) where.responsavelId = filters.responsavelId;

  const demands = await prisma.demand.findMany({
    where,
    orderBy: [{ prioridade: "asc" }, { criadaEm: "asc" }],
    include: demandInclude,
  });

  return demands
    .map(toDemandRecord)
    .sort((a, b) => PRIORITY_ORDER[a.prioridade] - PRIORITY_ORDER[b.prioridade] || Date.parse(a.criadaEm) - Date.parse(b.criadaEm));
}

export async function createDemand(input: Pick<Demand, "descricao" | "prioridade" | "tipo" | "sistema" | "clienteId" | "criadaPor" | "anexos"> & { cliente: string }): Promise<Demand> {
  const criadaPor = await prisma.user.findFirst({ where: { name: input.criadaPor } });
  if (!criadaPor) throw new Error("USER_NOT_FOUND");

  const demand = await prisma.$transaction(async (transaction) => {
    const counter = await transaction.demandCounter.update({
      where: { id: 1 },
      data: { nextNumber: { increment: 1 } },
    });
    return transaction.demand.create({
      data: {
        numero: counter.nextNumber - 1,
        descricao: input.descricao,
        prioridade: input.prioridade,
        tipo: input.tipo,
        sistema: input.sistema,
        status: "Pendente",
        clienteId: input.clienteId!,
        criadaPorId: criadaPor.id,
        anexos: input.anexos?.length ? {
          create: input.anexos.map((nomeArquivo) => ({
            nomeArquivo,
            caminho: path.join("data", "uploads", nomeArquivo),
          })),
        } : undefined,
      },
      include: demandInclude,
    });
  });

  return toDemandRecord(demand);
}

export async function updateDemandStatus(id: string, status: Status): Promise<Demand | null> {
  const demand = await prisma.demand.update({
    where: { id },
    data: { status },
    include: demandInclude,
  }).catch(() => null);
  return demand ? toDemandRecord(demand) : null;
}

export async function getDemandById(id: string): Promise<Demand | null> {
  const demand = await prisma.demand.findUnique({ where: { id }, include: demandInclude });
  return demand ? toDemandRecord(demand) : null;
}

export async function claimDemand(id: string, userId: string): Promise<Demand | null> {
  const result = await prisma.demand.updateMany({
    where: { id, responsavelId: null },
    data: { responsavelId: userId },
  });
  if (result.count === 0) return null;
  const demand = await prisma.demand.findUnique({ where: { id }, include: demandInclude });
  return demand ? toDemandRecord(demand) : null;
}

export async function releaseDemand(id: string, userId: string): Promise<Demand | null> {
  const result = await prisma.demand.updateMany({
    where: { id, responsavelId: userId },
    data: { responsavelId: null },
  });
  if (result.count === 0) return null;
  const demand = await prisma.demand.findUnique({ where: { id }, include: demandInclude });
  return demand ? toDemandRecord(demand) : null;
}

export async function createDemandComment(
  demandId: string,
  authorId: string,
  conteudo: string,
  returnToPending: boolean,
): Promise<{ comment: Demand["comentarios"][number]; status: Status } | null> {
  return prisma.$transaction(async (transaction) => {
    const demand = await transaction.demand.findUnique({ where: { id: demandId }, select: { status: true } });
    if (!demand) return null;
    const comment = await transaction.demandComment.create({
      data: { demandId, authorId, conteudo },
      include: { autor: { select: { id: true, name: true } } },
    });
    const status = returnToPending && demand.status === "Aguardando informação"
      ? (await transaction.demand.update({ where: { id: demandId }, data: { status: "Pendente" }, select: { status: true } })).status
      : demand.status;
    return {
      comment: { ...comment, createdAt: comment.createdAt.toISOString() },
      status: status as Status,
    };
  });
}

export async function hasClientDemands(client: Client): Promise<boolean> {
  const count = await prisma.demand.count({ where: { clienteId: client.id } });
  return count > 0;
}

export async function attachLegacyDemandsToClient(client: Client): Promise<void> {
  const legacyDemands = await prisma.demand.findMany({
    select: { id: true, cliente: { select: { nome: true } } },
  });
  const legacyIds = legacyDemands
    .filter(({ cliente }) => cliente.nome.localeCompare(client.nome, "pt-BR", { sensitivity: "accent" }) === 0)
    .map(({ id }) => id);

  await Promise.all(legacyIds.map((id) => prisma.demand.update({
    where: { id },
    data: { clienteId: client.id },
  })));
}
