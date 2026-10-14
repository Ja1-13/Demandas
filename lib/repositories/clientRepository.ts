import "server-only";
import { prisma } from "@/lib/prisma";
import type { Client } from "@/lib/types";

function normalizeClientName(nome: string): string {
  return nome.trim();
}

export async function listClients(): Promise<Client[]> {
  const clients = await prisma.client.findMany({ orderBy: { nome: "asc" } });
  return clients.map((client) => ({
    ...client,
    contato: client.contato ?? "",
    createdAt: client.createdAt.toISOString(),
  }));
}

export async function findClientById(id: string): Promise<Client | null> {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return null;
  return { ...client, contato: client.contato ?? "", createdAt: client.createdAt.toISOString() };
}

export async function createClient(input: { nome: string; contato: string }): Promise<Client> {
  const nome = normalizeClientName(input.nome);
  const existing = await prisma.client.findFirst({ where: { nome } });
  if (existing) throw new Error("CLIENT_NAME_EXISTS");

  const created = await prisma.client.create({
    data: { nome, contato: input.contato.trim() || null },
  });
  return { ...created, contato: created.contato ?? "", createdAt: created.createdAt.toISOString() };
}

export async function updateClient(id: string, input: { nome: string; contato: string }): Promise<Client | null> {
  const nome = normalizeClientName(input.nome);
  const existing = await prisma.client.findFirst({
    where: { nome, id: { not: id } },
  });
  if (existing) return null;

  const updated = await prisma.client.update({
    where: { id },
    data: { nome, contato: input.contato.trim() || null },
  });
  return { ...updated, contato: updated.contato ?? "", createdAt: updated.createdAt.toISOString() };
}

export async function deleteClient(id: string): Promise<Client | null> {
  const existing = await prisma.client.findUnique({ where: { id } });
  if (!existing) return null;
  const deleted = await prisma.client.delete({ where: { id } });
  return { ...deleted, contato: deleted.contato ?? "", createdAt: deleted.createdAt.toISOString() };
}