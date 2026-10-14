"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { Demand, Perfil, Prioridade, Sistema, Status, Tipo } from "@/lib/types";
import { SISTEMAS, STATUS, TIPOS } from "@/lib/types";
import { Modal } from "@/components/Modal";

const priorityStyle: Record<Prioridade, string> = {
  Alta: "bg-red-50 text-red-700 ring-red-200",
  Média: "bg-amber-50 text-amber-800 ring-amber-200",
  Baixa: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};
const statusStyle: Record<Status, string> = {
  Pendente: "bg-orange-50 text-orange-800 ring-orange-200",
  "Aguardando informação": "bg-amber-50 text-amber-800 ring-amber-200",
  "Em desenvolvimento": "bg-sky-50 text-sky-800 ring-sky-200",
  Concluída: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};
const statusTableStyle: Record<Status, string> = {
  Pendente: "bg-orange-50 text-orange-800",
  "Aguardando informação": "bg-amber-50 text-amber-800",
  "Em desenvolvimento": "bg-sky-50 text-sky-800",
  Concluída: "bg-emerald-50 text-emerald-800",
};
const priorityEdgeStyle: Record<Prioridade, string> = {
  Alta: "border-t-red-500",
  Média: "border-t-amber-400",
  Baixa: "border-t-emerald-500",
};
const priorityBarStyle: Record<Prioridade, string> = {
  Alta: "border-l-[3px] border-l-red-500",
  Média: "border-l-[3px] border-l-amber-400",
  Baixa: "border-l-[3px] border-l-emerald-500",
};
type StatusFilter = "all" | "open" | "pending" | "inProgress" | "completed";

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function DemandBoard() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [profile, setProfile] = useState<Perfil | null>(null);
  const [userId, setUserId] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [clientSearch, setClientSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [systemFilter, setSystemFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<Demand | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    async function loadDemands() {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ status: "all" });
      if (systemFilter) params.set("sistema", systemFilter);
      if (typeFilter) params.set("tipo", typeFilter);
      if (mineOnly) params.set("mine", "true");
      try {
        const response = await fetch(`/api/demands?${params}`);
        if (!response.ok) throw new Error("Não foi possível carregar as demandas.");
        setDemands(await response.json() as Demand[]);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Falha ao carregar dados.");
      } finally {
        setLoading(false);
      }
    }
    void loadDemands();
  }, [systemFilter, typeFilter, mineOnly]);
  useEffect(() => {
    fetch("/api/auth/me").then((response) => response.ok ? response.json() as Promise<{ id: string; perfil: Perfil }> : null).then((user) => {
      if (user) {
        setProfile(user.perfil);
        setUserId(user.id);
      }
    }).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!selected) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (zoomedImage) setZoomedImage(null);
      else setSelected(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selected, zoomedImage]);

  async function changeStatus(demand: Demand, status: Status) {
    setSavingId(demand.id);
    try {
      const response = await fetch(`/api/demands/${demand.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json() as Demand | { error?: string };
      if (!response.ok) throw new Error("error" in result ? result.error : "Não foi possível atualizar.");
      const updated = result as Demand;
      setDemands((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao atualizar status.");
    } finally {
      setSavingId("");
    }
  }

  function updateDemand(updated: Demand) {
    setDemands((current) => mineOnly && updated.responsavelId !== userId
      ? current.filter((item) => item.id !== updated.id)
      : current.map((item) => item.id === updated.id ? updated : item));
    setSelected(updated);
  }

  async function changeAssignee(action: "claim" | "release") {
    if (!selected) return;
    setSavingId(selected.id);
    try {
      const response = await fetch(`/api/demands/${selected.id}/assignee`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await response.json() as Demand | { error?: string };
      if (!response.ok) throw new Error("error" in result ? result.error : "Não foi possível atualizar o responsável.");
      updateDemand(result as Demand);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao atualizar responsável.");
    } finally {
      setSavingId("");
    }
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !commentText.trim()) return;
    setSavingId(selected.id);
    try {
      const response = await fetch(`/api/demands/${selected.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conteudo: commentText }),
      });
      const result = await response.json() as { demand?: Demand; error?: string };
      if (!response.ok || !result.demand) throw new Error(result.error || "Não foi possível adicionar o comentário.");
      updateDemand(result.demand);
      setCommentText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao adicionar comentário.");
    } finally {
      setSavingId("");
    }
  }

  const normalizedClientSearch = normalizeSearchText(clientSearch.trim());
  const numericSearch = clientSearch.trim().replace(/^#/, "");
  const searchFilteredDemands = demands.filter((demand) =>
    normalizeSearchText(demand.cliente).includes(normalizedClientSearch)
    || (/^\d+$/.test(numericSearch) && String(demand.numero) === numericSearch),
  );
  const visibleDemands = searchFilteredDemands.filter((demand) => {
    if (statusFilter === "open") return demand.status !== "Concluída";
    if (statusFilter === "pending") return demand.status === "Pendente" || demand.status === "Aguardando informação";
    if (statusFilter === "inProgress") return demand.status === "Em desenvolvimento";
    if (statusFilter === "completed") return demand.status === "Concluída";
    return true;
  });
  const countCards: { id: "pending" | "inProgress" | "completed"; label: string; count: number; dotStyle: string }[] = [
    { id: "pending", label: "Pendentes", count: searchFilteredDemands.filter((demand) => demand.status === "Pendente" || demand.status === "Aguardando informação").length, dotStyle: "bg-orange-500" },
    { id: "inProgress", label: "Em desenvolvimento", count: searchFilteredDemands.filter((demand) => demand.status === "Em desenvolvimento").length, dotStyle: "bg-sky-500" },
    { id: "completed", label: "Concluídas", count: searchFilteredDemands.filter((demand) => demand.status === "Concluída").length, dotStyle: "bg-emerald-600" },
  ];
  const tabs: { id: StatusFilter; label: string }[] = [{ id: "open", label: "Pendentes" }, { id: "all", label: "Todas" }, { id: "completed", label: "Concluídas" }];

  return (
    <section className="page-enter">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h1 className="m-0 text-xl font-semibold leading-tight text-fit-blue-title">Demandas</h1>
        {(profile === "SUPORTE" || profile === "ADM") && <Link href="/demands/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-fit-green px-3 text-sm font-medium text-white no-underline transition-colors hover:bg-fit-green-dark"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>Nova demanda</Link>}
      </div>
      <div className="mb-5 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-md border border-line bg-white">
        {countCards.map((card) => <button key={card.id} type="button" aria-pressed={statusFilter === card.id} onClick={() => setStatusFilter(card.id)} className={`flex min-w-0 flex-col gap-1 px-3 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fit-blue sm:px-5 ${statusFilter === card.id ? "bg-gray-50" : "hover:bg-gray-50"}`}>
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted"><span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${card.dotStyle}`} /><span className="truncate">{card.label}</span></span><span className="text-2xl font-semibold tabular-nums text-ink">{card.count}</span>
        </button>)}
      </div>
      <div className="mb-5 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1" role="tablist" aria-label="Filtrar por status">
          {tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={statusFilter === tab.id} onClick={() => setStatusFilter(tab.id)} className={`h-9 rounded-md border-b-2 px-3 text-sm ${statusFilter === tab.id ? "border-fit-blue-title font-semibold text-fit-blue-title" : "border-transparent text-muted hover:bg-gray-100 hover:text-ink"}`}>{tab.label}</button>)}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {(profile === "DEV" || profile === "ADM") && <label className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm text-ink"><input type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} className="h-4 w-4 accent-fit-blue" />Minhas demandas</label>}
          <label className="relative block w-full sm:w-56"><span className="sr-only">Buscar por cliente ou número da demanda</span><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"><circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" /><path d="m13 13 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg><input type="search" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Cliente ou #número" aria-label="Buscar por cliente ou número da demanda" className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20" /></label>
          <select aria-label="Filtrar por sistema" value={systemFilter} onChange={(event) => setSystemFilter(event.target.value)} className="h-9 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20"><option value="">Todos os sistemas</option>{SISTEMAS.map((system) => <option key={system}>{system}</option>)}</select>
          <select aria-label="Filtrar por tipo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-9 max-w-[220px] rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20"><option value="">Todos os tipos</option>{TIPOS.map((type) => <option key={type}>{type}</option>)}</select>
        </div>
      </div>
      {error && <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading ? <div className="rounded-md border border-line bg-white px-5 py-12 text-center text-sm text-muted">Carregando demandas…</div> : visibleDemands.length === 0 ? <div className="rounded-md border border-line bg-white px-5 py-14 text-center"><p className="m-0 font-medium">{clientSearch.trim() ? `Nenhuma demanda encontrada para “${clientSearch.trim()}”` : "Nenhuma demanda encontrada"}</p><p className="mb-0 mt-1 text-sm text-muted">{clientSearch.trim() ? <>Tente outro nome ou <button type="button" onClick={() => setClientSearch("")} className="font-medium text-fit-blue-title underline underline-offset-2">limpe a busca</button>.</> : "Ajuste os filtros ou crie uma nova demanda."}</p></div> : <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
          <thead className="bg-gray-100 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-600">
            <tr className="h-10 border-b border-line">
              <th scope="col" className="w-[7%] px-3">Número</th>
              <th scope="col" className="w-[12%] px-3">Cliente</th>
              <th scope="col" className="w-[18%] px-3">Descrição</th>
              <th scope="col" className="w-[9%] px-3">Sistema</th>
              <th scope="col" className="w-[14%] px-3">Tipo</th>
              <th scope="col" className="w-[8%] px-3">Prioridade</th>
              <th scope="col" className="w-[12%] px-3">Responsável</th>
              <th scope="col" className="w-[12%] px-3">Status</th>
              <th scope="col" className="w-[8%] px-3">Criada em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {visibleDemands.map((demand) => <tr key={demand.id} role="button" tabIndex={0} aria-label={`${demand.cliente}: ${demand.descricao}`} onClick={() => setSelected(demand)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(demand); } }} className={`h-12 cursor-pointer text-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fit-blue ${demand.status === "Concluída" ? "opacity-60" : ""}`}>
              <td className="px-3 font-semibold tabular-nums text-muted">#{demand.numero}</td>
              <td className={`truncate border-line px-3 font-medium text-ink ${priorityBarStyle[demand.prioridade]}`}>{demand.cliente}</td>
              <td className="px-3 text-gray-600"><span className="flex min-w-0 items-center gap-2"><span className="truncate">{demand.descricao}</span>{Boolean(demand.anexos?.length) && <span title="Possui imagens anexadas" aria-label="Possui imagens anexadas" className="shrink-0 text-gray-500"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="m7.5 10.5 4.8-4.8a2.5 2.5 0 0 1 3.5 3.5l-7.1 7.1a4 4 0 0 1-5.7-5.7l7.1-7.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></span>}</span></td>
              <td className="px-3"><span className="inline-block max-w-full truncate rounded-[4px] bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{demand.sistema}</span></td>
              <td className="px-3"><span className="inline-block max-w-full truncate rounded-[4px] bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">{demand.tipo}</span></td>
              <td className="px-3 text-xs font-medium text-gray-700">{demand.prioridade}</td>
              <td className="truncate px-3 text-xs text-gray-700">{demand.responsavel?.name ?? <span className="text-muted">—</span>}</td>
              <td className="px-3"><span className={`inline-block max-w-full truncate rounded-[4px] px-2 py-1 text-xs font-medium ${statusTableStyle[demand.status]}`}>{demand.status}</span></td>
              <td className="whitespace-nowrap px-3 text-xs text-gray-600">{new Date(demand.criadaEm).toLocaleDateString("pt-BR")}</td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      <p className="mb-0 mt-3 text-xs text-muted">{visibleDemands.length} {visibleDemands.length === 1 ? "demanda" : "demandas"}</p>

      {selected && <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} ariaLabelledBy="demand-title" contentClassName={`w-full max-w-3xl border-t-4 ${priorityEdgeStyle[selected.prioridade]}`}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-8 sm:py-7">
          <div className="min-w-0"><p className="mb-1 text-xs font-semibold tabular-nums text-muted">#{selected.numero}</p><h2 id="demand-title" className="m-0 break-words text-xl font-semibold leading-tight text-fit-blue-title">{selected.cliente}</h2><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-muted">{selected.sistema}</span><span className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-muted">{selected.tipo}</span></div></div>
          <button type="button" onClick={() => setSelected(null)} aria-label="Fechar detalhes" className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-xl text-muted transition hover:bg-paper hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fit-blue"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg></button>
        </header>
        <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3"><span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset ${priorityStyle[selected.prioridade]}`}>Prioridade {selected.prioridade}</span></div>
            {profile === "DEV" || profile === "ADM" ? <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Status</h3><div className="flex flex-wrap gap-1 rounded-md border border-line bg-paper p-1" role="group" aria-label="Mudar status da demanda">{STATUS.map((status) => <button key={status} type="button" onClick={() => void changeStatus(selected, status)} className={`whitespace-nowrap rounded-[5px] border px-2.5 py-1.5 text-xs font-medium transition sm:px-3 ${selected.status === status ? "border-fit-blue bg-fit-blue text-white" : "border-transparent bg-white text-muted hover:border-gray-300 hover:text-ink"}`} aria-pressed={selected.status === status}>{status}</button>)}</div></div> : <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset ${statusStyle[selected.status]}`}>{selected.status}</span>}
            <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Descrição</h3><div className="min-h-28 rounded-md bg-paper p-4"><p className="m-0 whitespace-pre-wrap text-sm leading-6 text-ink">{selected.descricao}</p></div></div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line px-4 py-3"><div><h3 className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Responsável</h3><p className="mb-0 mt-1 text-sm font-medium text-ink">{selected.responsavel?.name ?? "Sem responsável"}</p></div>{(profile === "DEV" || profile === "ADM") && !selected.responsavel && <button type="button" disabled={savingId === selected.id} onClick={() => void changeAssignee("claim")} className="h-9 rounded-md border border-line px-3 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50">Assumir</button>}{selected.responsavelId === userId && <button type="button" disabled={savingId === selected.id} onClick={() => void changeAssignee("release")} className="h-9 rounded-md border border-line px-3 text-sm font-medium text-ink transition hover:bg-paper disabled:opacity-50">Liberar</button>}</div>
            {Boolean(selected.anexos?.length) && <div><h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Imagens anexadas</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{selected.anexos?.map((file) => <button key={file} type="button" onClick={() => setZoomedImage(file)} aria-label="Ampliar imagem anexada" className="group overflow-hidden rounded-md border border-line bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fit-blue"><Image src={`/api/attachments/${encodeURIComponent(file)}`} alt="Imagem anexada à demanda" width={320} height={220} unoptimized className="h-32 w-full object-cover sm:h-40" /></button>)}</div></div>}
            <section aria-labelledby="comments-title" className="space-y-4"><div className="flex items-center justify-between gap-3"><h3 id="comments-title" className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Comentários</h3><span className="text-xs text-muted">{selected.comentarios.length}</span></div>{selected.comentarios.length > 0 && <ol className="m-0 list-none space-y-3 p-0">{selected.comentarios.map((comment) => <li key={comment.id} className="rounded-md border border-line px-4 py-3"><div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><span className="text-sm font-medium text-ink">{comment.autor.name}</span><time dateTime={comment.createdAt} className="text-xs text-muted">{new Date(comment.createdAt).toLocaleString("pt-BR")}</time></div><p className="m-0 whitespace-pre-wrap text-sm leading-6 text-gray-700">{comment.conteudo}</p></li>)}</ol>}<form onSubmit={(event) => void addComment(event)} className="space-y-2"><label htmlFor="demand-comment" className="sr-only">Novo comentário</label><textarea id="demand-comment" value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={5000} rows={3} placeholder="Escreva um comentário" className="w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20" /><div className="flex justify-end"><button type="submit" disabled={savingId === selected.id || !commentText.trim()} className="h-9 rounded-md bg-fit-blue-title px-3 text-sm font-medium text-white transition hover:bg-fit-blue disabled:cursor-not-allowed disabled:opacity-50">Adicionar comentário</button></div></form></section>
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4 text-sm text-muted"><p className="m-0 inline-flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-muted"><circle cx="10" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" /><path d="M4 17c.6-3 2.6-4.5 6-4.5s5.4 1.5 6 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>{selected.criadaPor}</p><p className="m-0 inline-flex items-center gap-2"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-muted"><rect x="3" y="4.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" /><path d="M6.5 2.5v4M13.5 2.5v4M3 8.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>{new Date(selected.criadaEm).toLocaleString("pt-BR")}</p></div>
          </div>
        </div>
        <footer className="flex shrink-0 items-center justify-end border-t border-line px-5 py-4 sm:px-8">
          <button type="button" onClick={() => setSelected(null)} className="inline-flex h-9 whitespace-nowrap rounded-md border border-line bg-white px-4 text-sm font-medium text-ink transition hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fit-blue">Fechar</button>
        </footer>
      </Modal>}
      {zoomedImage && <Modal isOpen={Boolean(zoomedImage)} onClose={() => setZoomedImage(null)} contentClassName="max-w-full w-auto bg-transparent shadow-none" closeOnOutsideClick className="bg-black/85 p-4" showCloseButton>
        <div className="flex max-h-[calc(100vh-48px)] max-w-[90vw] items-center justify-center overflow-hidden rounded-md bg-white">
          <Image src={`/api/attachments/${encodeURIComponent(zoomedImage)}`} alt="Imagem anexada ampliada" width={1600} height={1200} unoptimized className="max-h-[calc(100vh-48px)] max-w-full object-contain" />
        </div>
      </Modal>}
      
    </section>
  );
}