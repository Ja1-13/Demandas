import "server-only";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import type { Perfil, PublicUser, User } from "@/lib/types";
import { toPublicUser } from "@/lib/types";

type UserRecord = Omit<User, "createdAt"> & { createdAt: Date };

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function initializeUsers(): Promise<void> {
  const username = normalizeUsername(process.env.ADMIN_USERNAME || "admin");
  const passwordHash = await hashPassword(process.env.ADMIN_PASSWORD || "admin123");

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      name: "Administrador",
      passwordHash,
      perfil: "ADM",
    },
  });
}

export async function listUsers(): Promise<PublicUser[]> {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return users.map((user) => toPublicUser({ ...user, createdAt: user.createdAt.toISOString() })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function findUserByUsername(username: string): Promise<User | undefined> {
  const user = await prisma.user.findUnique({ where: { username: normalizeUsername(username) } });
  return user ? { ...user, createdAt: user.createdAt.toISOString() } : undefined;
}

export async function createUser(input: { username: string; name: string; password: string; perfil: Perfil }): Promise<PublicUser> {
  const normalizedUsername = normalizeUsername(input.username);
  try {
    const created = await prisma.user.create({
      data: {
        username: normalizedUsername,
        name: input.name.trim(),
        passwordHash: await hashPassword(input.password),
        perfil: input.perfil,
      },
    });
    return toPublicUser({ ...created, createdAt: created.createdAt.toISOString() });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("USERNAME_EXISTS");
    }
    throw error;
  }
}