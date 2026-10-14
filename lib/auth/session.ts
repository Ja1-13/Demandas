import "server-only";
import { timingSafeEqual, webcrypto } from "node:crypto";
import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/types";

export const SESSION_COOKIE = "demandas_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

function secret(): string {
  if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET precisa estar configurado em produção.");
  }
  return process.env.SESSION_SECRET || "development-only-secret-change-before-deploy-2026";
}

async function signature(value: string): Promise<string> {
  const key = await webcrypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await webcrypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Buffer.from(signed).toString("base64url");
}

export async function createSessionToken(user: Omit<SessionUser, "exp">): Promise<string> {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS })).toString("base64url");
  return `${payload}.${await signature(payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) return null;
  const expectedSignature = await signature(payload);
  const expected = Buffer.from(expectedSignature);
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
    if (!user.id || !user.username || !user.name || !["SUPORTE", "DEV", "ADM"].includes(user.perfil) || !Number.isFinite(user.exp) || user.exp <= Date.now() / 1000) return null;
    return user;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  return verifySessionToken(cookies().get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};