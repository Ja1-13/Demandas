import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/passwordHash";
import type { Client, Demand, User } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

function toRecord<T>(value: unknown): T {
  if (!value || typeof value !== "object") throw new Error("Valor JSON inválido.");
  return value as T;
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

async function ensureAdmin(): Promise<void> {
  const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return;

  const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || "admin123");
  await prisma.user.create({
    data: {
      username,
      name: "Administrador",
      passwordHash,
      perfil: "ADM",
      createdAt: new Date(),
    },
  });
}

async function importUsers(): Promise<Map<string, string>> {
  const file = path.join(DATA_DIR, "users.json");
  const parsed = toRecord<User[]>(JSON.parse(await readFile(file, "utf8")));
  const createdById = new Map<string, string>();

  for (const user of parsed) {
    const current = await prisma.user.findUnique({ where: { id: user.id } });
    const normalizedUsername = normalizeUsername(user.username);
    const existingWithUsername = current
      ? null
      : await prisma.user.findUnique({ where: { username: normalizedUsername } });

    if (!current && existingWithUsername) {
      createdById.set(existingWithUsername.name.toLocaleLowerCase("pt-BR"), existingWithUsername.id);
      createdById.set(existingWithUsername.username.toLocaleLowerCase("pt-BR"), existingWithUsername.id);
      continue;
    }

    const existing = await prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
        perfil: user.perfil,
        createdAt: new Date(user.createdAt),
      },
      create: {
        id: user.id,
        username: normalizedUsername,
        name: user.name,
        passwordHash: user.passwordHash,
        perfil: user.perfil,
        createdAt: new Date(user.createdAt),
      },
    });
    createdById.set(existing.name.toLocaleLowerCase("pt-BR"), existing.id);
    createdById.set(existing.username.toLocaleLowerCase("pt-BR"), existing.id);
  }

  return createdById;
}

async function importClients(): Promise<Map<string, string>> {
  const file = path.join(DATA_DIR, "clients.json");
  const parsed = toRecord<Client[]>(JSON.parse(await readFile(file, "utf8")));
  const clientIds = new Map<string, string>();

  for (const client of parsed) {
    const created = await prisma.client.upsert({
      where: { id: client.id },
      update: {
        nome: client.nome,
        contato: client.contato || null,
        createdAt: new Date(client.createdAt),
      },
      create: {
        id: client.id,
        nome: client.nome,
        contato: client.contato || null,
        createdAt: new Date(client.createdAt),
      },
    });
    clientIds.set(created.id, created.id);
  }

  return clientIds;
}

async function importDemands(createdByIds: Map<string, string>, clientIds: Map<string, string>): Promise<void> {
  const file = path.join(DATA_DIR, "demands.json");
  const parsed = toRecord<Demand[]>(JSON.parse(await readFile(file, "utf8")));

  for (const demand of parsed) {
    const createdById = createdByIds.get(demand.criadaPor.toLocaleLowerCase("pt-BR")) ?? createdByIds.get("administrador");
    if (!createdById) throw new Error(`Usuário responsável pela demanda ${demand.id} não encontrado.`);
    const client = demand.clienteId
      ? await prisma.client.findUnique({ where: { id: demand.clienteId } })
      : await prisma.client.findFirst({ where: { nome: demand.cliente } });

    if (!client) continue;

    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.demand.findUnique({ where: { id: demand.id }, select: { id: true } });
      const data = {
        descricao: demand.descricao,
        prioridade: demand.prioridade,
        tipo: demand.tipo,
        sistema: demand.sistema,
        status: demand.status,
        clienteId: client.id,
        criadaPorId: createdById,
        criadaEm: new Date(demand.criadaEm),
        atualizadaEm: new Date(demand.criadaEm),
      };

      if (existing) {
        await transaction.demand.update({ where: { id: demand.id }, data });
        return;
      }

      const counter = await transaction.demandCounter.update({
        where: { id: 1 },
        data: { nextNumber: { increment: 1 } },
      });
      await transaction.demand.create({ data: { ...data, id: demand.id, numero: counter.nextNumber - 1 } });
    });

    const filenames = Array.isArray(demand.anexos) ? demand.anexos : [];
    for (const arquivo of filenames) {
      const nomeArquivo = typeof arquivo === "string" ? arquivo : "";
      if (!nomeArquivo) continue;
      const caminho = path.join(DATA_DIR, "uploads", nomeArquivo);
      const caminhoExists = await stat(caminho).then(() => true).catch(() => false);
      if (!caminhoExists) continue;
      await prisma.attachment.upsert({
        where: { id: `${demand.id}:${nomeArquivo}` },
        update: { nomeArquivo, caminho },
        create: { id: `${demand.id}:${nomeArquivo}`, demandId: demand.id, nomeArquivo, caminho },
      });
    }
  }
}

async function main(): Promise<void> {
  await ensureAdmin();
  const createdByIds = await importUsers();
  const clients = await importClients();
  await importDemands(createdByIds, clients);
  console.log("Dados JSON importados para SQLite com sucesso.");
}

main()
  .catch((error: unknown) => {
    console.error("Erro ao importar os dados JSON:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
