import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createDemand, listDemands } from "@/lib/repositories/demandRepository";
import { findClientById, listClients } from "@/lib/repositories/clientRepository";
import { removeAttachment, saveAttachment, type AttachmentExtension } from "@/lib/repositories/attachmentRepository";
import { withDataLock } from "@/lib/server/jsonStore";
import { PRIORIDADES, SISTEMAS, TIPOS } from "@/lib/types";
import type { Prioridade, Sistema, Tipo } from "@/lib/types";

const MAX_ATTACHMENT_COUNT = 3;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const allowedImageTypes: Record<string, AttachmentExtension> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function matchesImageSignature(content: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") return content.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/jpeg") return content.length >= 3 && content[0] === 0xff && content[1] === 0xd8 && content[2] === 0xff;
  return mimeType === "image/webp" && content.length >= 12 && content.toString("ascii", 0, 4) === "RIFF" && content.toString("ascii", 8, 12) === "WEBP";
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const status = params.get("status") || "all";
  if (!["all", "open", "completed"].includes(status)) return NextResponse.json({ error: "Filtro de status inválido." }, { status: 400 });
  const sistema = params.get("sistema");
  const tipo = params.get("tipo");
  const mine = params.get("mine") === "true";
  if (mine && !["DEV", "ADM"].includes(session.perfil)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  if (sistema && !SISTEMAS.includes(sistema as Sistema)) return NextResponse.json({ error: "Sistema inválido." }, { status: 400 });
  if (tipo && !TIPOS.includes(tipo as Tipo)) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  const [demands, clients] = await Promise.all([
    listDemands({ status: status as "all" | "open" | "completed", sistema: sistema as Sistema | undefined, tipo: tipo as Tipo | undefined, responsavelId: mine ? session.id : undefined }),
    listClients(),
  ]);
  const clientsById = new Map(clients.map((client) => [client.id, client.nome]));
  return NextResponse.json(demands.map((demand) => ({ ...demand, cliente: demand.clienteId ? clientsById.get(demand.clienteId) ?? demand.cliente : demand.cliente })));
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!["SUPORTE", "ADM"].includes(session.perfil)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
  };
  const descricao = field("descricao");
  const clienteId = field("clienteId");
  const tipo = field("tipo");
  const prioridade = field("prioridade");
  const sistema = field("sistema");
  if (!descricao || descricao.length > 5000) return NextResponse.json({ error: "A descrição é obrigatória (até 5.000 caracteres)." }, { status: 400 });
  if (!clienteId) return NextResponse.json({ error: "Selecione um cliente cadastrado." }, { status: 400 });
  if (!PRIORIDADES.includes(prioridade as Prioridade) || !TIPOS.includes(tipo as Tipo) || !SISTEMAS.includes(sistema as Sistema)) {
    return NextResponse.json({ error: "Confira prioridade, tipo e sistema." }, { status: 400 });
  }
  const formEntries = form.getAll("images");
  if (formEntries.some((entry) => typeof entry === "string" && entry.length > 0)) {
    return NextResponse.json({ error: "Cada anexo deve ser um arquivo de imagem válido." }, { status: 400 });
  }
  const imageFiles = formEntries.filter((entry): entry is File => typeof entry !== "string" && (entry.size > 0 || entry.name.length > 0));
  if (tipo !== "Correção de bug/erro" && imageFiles.length > 0) {
    return NextResponse.json({ error: "Imagens só podem ser anexadas a demandas de correção de bug/erro." }, { status: 400 });
  }
  if (imageFiles.length > MAX_ATTACHMENT_COUNT) return NextResponse.json({ error: "É permitido anexar no máximo 3 imagens por demanda." }, { status: 400 });

  const validatedImages: { content: Buffer; extension: AttachmentExtension }[] = [];
  for (const file of imageFiles) {
    if (file.size === 0) return NextResponse.json({ error: `O arquivo "${file.name}" está vazio. Selecione uma imagem válida.` }, { status: 400 });
    if (file.size > MAX_ATTACHMENT_SIZE) return NextResponse.json({ error: `A imagem "${file.name}" ultrapassa o limite de 5 MB.` }, { status: 400 });
    const extension = allowedImageTypes[file.type];
    if (!extension) return NextResponse.json({ error: "Formato inválido. Envie imagens PNG, JPG ou WEBP." }, { status: 400 });
    const content = Buffer.from(await file.arrayBuffer());
    if (!matchesImageSignature(content, file.type)) return NextResponse.json({ error: `O arquivo "${file.name}" não corresponde a uma imagem PNG, JPG ou WEBP válida.` }, { status: 400 });
    validatedImages.push({ content, extension });
  }

  return withDataLock(async () => {
    const client = await findClientById(clienteId);
    if (!client) return NextResponse.json({ error: "O cliente selecionado não existe mais. Atualize a página e tente novamente." }, { status: 400 });
    const savedAttachments: string[] = [];
    try {
      for (const image of validatedImages) savedAttachments.push(await saveAttachment(image.content, image.extension));
      const demand = await createDemand({
        descricao, cliente: client.nome, clienteId: client.id,
        prioridade: prioridade as Prioridade,
        tipo: tipo as Tipo,
        sistema: sistema as Sistema,
        criadaPor: session.name,
        anexos: savedAttachments,
      });
      return NextResponse.json(demand, { status: 201 });
    } catch (error) {
      await Promise.all(savedAttachments.map(removeAttachment));
      throw error;
    }
  });
}