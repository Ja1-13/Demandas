import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { readAttachment } from "@/lib/repositories/attachmentRepository";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: { params: { file: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const content = await readAttachment(params.file);
  if (!content) return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
  const extension = params.file.split(".").at(-1)?.toLowerCase() ?? "";
  return new NextResponse(new Uint8Array(content), {
    headers: {
      "Content-Type": CONTENT_TYPES[extension],
      "Content-Length": String(content.length),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}