import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export type AttachmentExtension = "png" | "jpg" | "webp";

const uploadDirectory = path.join(process.cwd(), "data", "uploads");
const attachmentNamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/i;

export async function saveAttachment(content: Buffer, extension: AttachmentExtension): Promise<string> {
  await mkdir(uploadDirectory, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadDirectory, fileName), content, { flag: "wx" });
  return fileName;
}

export function attachmentPath(fileName: string): string | null {
  return attachmentNamePattern.test(fileName) ? path.join(uploadDirectory, fileName) : null;
}

export async function readAttachment(fileName: string): Promise<Buffer | null> {
  const filePath = attachmentPath(fileName);
  if (!filePath) return null;
  try {
    return await readFile(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function removeAttachment(fileName: string): Promise<void> {
  const filePath = attachmentPath(fileName);
  if (!filePath) return;
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}