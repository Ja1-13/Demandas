"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { PRIORIDADES, SISTEMAS, TIPOS } from "@/lib/types";
import type { Client, Prioridade, Sistema, Tipo } from "@/lib/types";

interface SelectedImage {
  file: File;
  previewUrl: string;
}

const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
type DemandField = "clienteId" | "sistema" | "tipo" | "prioridade" | "descricao";

const priorityColors: Record<Prioridade, { dot: string; selected: string }> = {
  Alta: { dot: "bg-red-600", selected: "border-red-600 bg-red-600 text-white" },
  Média: { dot: "bg-amber-600", selected: "border-amber-600 bg-amber-600 text-white" },
  Baixa: { dot: "bg-green-600", selected: "border-green-600 bg-green-600 text-white" },
};

export function DemandForm() {
  const router = useRouter();
  const imageInput = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<SelectedImage[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clienteId, setClienteId] = useState("");
  const [sistema, setSistema] = useState<Sistema | "">("");
  const [tipo, setTipo] = useState<Tipo | "">("");
  const [prioridade, setPrioridade] = useState<Prioridade>("Média");
  const [descricao, setDescricao] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<DemandField, string>>>({});
  const [images, setImages] = useState<SelectedImage[]>([]);

  useEffect(() => {
    fetch("/api/clients")
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar os clientes.");
        setClients(await response.json() as Client[]);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar os clientes."))
      .finally(() => setClientsLoading(false));
  }, []);

  useEffect(() => { imagesRef.current = images; }, [images]);
  useEffect(() => () => imagesRef.current.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl)), []);

  function selectType(value: string) {
    setTipo(value as Tipo);
    setError("");
    setFieldErrors((current) => ({ ...current, tipo: undefined }));
    if (value !== "Correção de bug/erro") {
      images.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      setImages([]);
      if (imageInput.current) imageInput.current.value = "";
    }
  }

  function clearFieldError(field: DemandField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (selectedFiles.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type))) {
      setError("Formato inválido. Selecione apenas imagens PNG, JPG ou WEBP.");
      return;
    }
    if (selectedFiles.some((file) => file.size === 0)) {
      setError("O arquivo está vazio. Selecione uma imagem válida.");
      return;
    }
    if (selectedFiles.some((file) => file.size > MAX_IMAGE_SIZE)) {
      setError("Cada imagem pode ter no máximo 5 MB.");
      return;
    }
    if (images.length + selectedFiles.length > MAX_IMAGES) {
      setError("É permitido anexar no máximo 3 imagens.");
      return;
    }
    setError("");
    const newImages = selectedFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setImages((current) => [...current, ...newImages]);
  }

  function removeImage(index: number) {
    const removed = images[index];
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    setImages((current) => {
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    setSuccess(false);
    const form = new FormData(formElement);
    const nextErrors: Partial<Record<DemandField, string>> = {};
    if (!String(form.get("clienteId") ?? "").trim()) nextErrors.clienteId = "Selecione um cliente.";
    if (!String(form.get("sistema") ?? "").trim()) nextErrors.sistema = "Selecione um sistema.";
    if (!String(form.get("tipo") ?? "").trim()) nextErrors.tipo = "Selecione um tipo.";
    if (!String(form.get("prioridade") ?? "").trim()) nextErrors.prioridade = "Selecione uma prioridade.";
    if (!String(form.get("descricao") ?? "").trim()) nextErrors.descricao = "Informe a descrição da demanda.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    form.delete("images");
    images.forEach(({ file }) => form.append("images", file));
    try {
      const response = await fetch("/api/demands", { method: "POST", body: form });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível criar a demanda.");
      setSuccess(true);
      formElement.reset();
      setClienteId("");
      setSistema("");
      setTipo("");
      setPrioridade("Média");
      setDescricao("");
      setFieldErrors({});
      images.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
      setImages([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao salvar.");
    } finally {
      setPending(false);
    }
  }

  const fieldClass = (invalid: boolean) => `mt-1.5 block h-10 w-full appearance-none rounded-md border bg-white px-3 pr-10 text-sm text-ink outline-none transition focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20 ${invalid ? "border-red-400" : "border-line"}`;
  const segmentClass = "h-10 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fit-blue focus-visible:ring-offset-1";

  return (
    <section className="page-enter mx-auto max-w-[720px]">
      <Link href="/demands" className="mb-4 inline-flex items-center gap-2 text-sm text-fit-blue no-underline hover:text-fit-blue-dark"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M16 10H4m0 0 5 5m-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>Voltar às demandas</Link>
      <h1 className="mb-5 mt-0 text-xl font-semibold text-[#12358A]">Nova demanda</h1>
      <form noValidate onSubmit={submit} className="space-y-6 rounded-lg border border-[#E5E7EB] bg-white p-5 sm:p-8">
        {success && <p role="status" className="mb-5 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Demanda criada com sucesso. <Link href="/demands" className="font-semibold text-emerald-900">Ver listagem</Link></p>}
        {error && <p role="alert" className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="client-select" className="block text-sm font-medium text-ink">Cliente <span className="text-red-600">*</span></label>
            <div className="relative">
              <select id="client-select" name="clienteId" value={clienteId} onChange={(event) => { setClienteId(event.target.value); clearFieldError("clienteId"); }} disabled={clientsLoading || clients.length === 0} className={fieldClass(Boolean(fieldErrors.clienteId))}>
                <option value="">{clientsLoading ? "Carregando clientes…" : "Selecione um cliente"}</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.nome}</option>)}
              </select>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            {fieldErrors.clienteId && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.clienteId}</p>}
            {!clientsLoading && clients.length === 0 && <p role="status" className="mb-0 mt-2 text-xs text-amber-800">Nenhum cliente cadastrado. Peça ao ADM para cadastrar um cliente.</p>}
          </div>
          <div>
            <label htmlFor="system-select" className="block text-sm font-medium text-ink">Sistema <span className="text-red-600">*</span></label>
            <div className="relative">
              <select id="system-select" name="sistema" value={sistema} onChange={(event) => { setSistema(event.target.value as Sistema); clearFieldError("sistema"); }} className={fieldClass(Boolean(fieldErrors.sistema))}>
                <option value="">Selecione um sistema</option>
                {SISTEMAS.map((system) => <option key={system} value={system}>{system}</option>)}
              </select>
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            {fieldErrors.sistema && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.sistema}</p>}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">Tipo <span className="text-red-600">*</span></p>
          <input type="hidden" name="tipo" value={tipo} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label="Tipo da demanda">
            {TIPOS.map((item) => <button key={item} type="button" aria-pressed={tipo === item} onClick={() => selectType(item)} className={`${segmentClass} ${tipo === item ? "border-[#12358A] bg-[#12358A] text-white" : "border-line bg-white text-ink hover:bg-gray-50"}`}>{item}</button>)}
          </div>
          {fieldErrors.tipo && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.tipo}</p>}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-ink">Prioridade <span className="text-red-600">*</span></p>
          <input type="hidden" name="prioridade" value={prioridade} />
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Prioridade da demanda">
            {PRIORIDADES.map((item) => <button key={item} type="button" aria-pressed={prioridade === item} onClick={() => { setPrioridade(item); clearFieldError("prioridade"); }} className={`${segmentClass} inline-flex items-center justify-center gap-2 px-2 sm:px-3 ${prioridade === item ? priorityColors[item].selected : "border-line bg-white text-ink hover:bg-gray-50"}`}>
              {prioridade !== item && <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${priorityColors[item].dot}`} />}{item}
            </button>)}
          </div>
          {fieldErrors.prioridade && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.prioridade}</p>}
        </div>

        {tipo === "Correção de bug/erro" && <div><label htmlFor="images-input" className="block text-sm font-medium text-ink">Anexar imagens <span className="font-normal text-muted">(opcional, até 3 imagens de 5 MB)</span></label><input ref={imageInput} id="images-input" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={selectImages} className="mt-1.5 block h-10 w-full rounded-md border border-line bg-white px-3 py-1 text-sm outline-none focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium" />{images.length > 0 && <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{images.map(({ file, previewUrl }, index) => <li key={`${file.name}-${file.lastModified}-${index}`} className="relative overflow-hidden rounded-md border border-line bg-gray-50"><Image src={previewUrl} alt={`Pré-visualização de ${file.name}`} width={320} height={180} unoptimized className="h-28 w-full object-cover" /><div className="flex items-center justify-between gap-2 px-2 py-1.5"><span className="truncate text-xs text-muted">{file.name}</span><button type="button" onClick={() => removeImage(index)} aria-label={`Remover ${file.name}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-white hover:text-ink"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></button></div></li>)}</ul>}</div>}

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-ink">Descrição <span className="text-red-600">*</span></label>
          <div className="relative">
            <textarea id="description" required name="descricao" maxLength={5000} rows={6} value={descricao} onChange={(event) => { setDescricao(event.target.value); clearFieldError("descricao"); }} placeholder="Descreva o que precisa ser feito" className={`mt-1.5 block min-h-[144px] w-full resize-y rounded-md border bg-white px-3 py-2.5 pb-8 text-sm text-ink outline-none focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20 ${fieldErrors.descricao ? "border-red-400" : "border-line"}`} />
            <span aria-live="polite" className="pointer-events-none absolute bottom-2 right-3 text-xs text-gray-400">{descricao.length}/5000</span>
          </div>
          {fieldErrors.descricao && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.descricao}</p>}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-5">
          <Link href="/demands" className="inline-flex h-10 items-center rounded-md border border-line px-4 text-sm font-medium text-ink no-underline hover:bg-gray-50">Cancelar</Link>
          <button type="submit" disabled={pending || clientsLoading || clients.length === 0} className="h-10 rounded-md bg-[#16A34A] px-4 text-sm font-medium text-white transition-colors hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Criando..." : "Criar demanda"}</button>
        </div>
      </form>
    </section>
  );
}