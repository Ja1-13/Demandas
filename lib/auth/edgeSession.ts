import type { SessionUser } from "@/lib/types";

const textEncoder = new TextEncoder();

export async function verifyEdgeSession(token?: string): Promise<SessionUser | null> {
  if (!token) return null;
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra) return null;
  try {
    if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) return null;
    const secret = process.env.SESSION_SECRET || "development-only-secret-change-before-deploy-2026";
    const key = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const signatureBytes = decodeBase64Url(supplied);
    const valid = await crypto.subtle.verify("HMAC", key, signatureBytes, textEncoder.encode(payload));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload))) as SessionUser;
    if (!session.id || !session.username || !session.name || !["SUPORTE", "DEV", "ADM"].includes(session.perfil)) return null;
    if (!Number.isFinite(session.exp) || session.exp <= Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return buffer;
}