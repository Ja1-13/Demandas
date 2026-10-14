"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Client } from "@/lib/types";
import { Modal } from "@/components/Modal";

const fieldClass = (invalid: boolean) => `mt-1.5 block h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20 ${invalid ? "border-red-400" : "border-line"}`;

type ClientFormField = "nome" | "contato";

export function ClientAdmin() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ClientFormField, string>>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);

  async function loadClients() {
    const response = await fetch("/api/clients");
    if (!response.ok) throw new Error("Não foi possível carregar os clientes.");
    setClients(await response.json() as Client[]);
  }

  useEffect(() => {
    loadClients().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "Falha ao carregar clientes."))
      .finally(() => setLoading(false));
  }, []);

  function openModal(client?: Client) {
    setEditingId(client?.id ?? null);
    setFieldErrors({});
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setFieldErrors({});
    setError("");
  }

  function clearFieldError(field: ClientFormField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function openConfirm(client: Client) {
    setSelectedClient(client);
    setError("");
    setConfirmOpen(true);
  }

  function closeConfirm() {
    setConfirmOpen(false);
    setSelectedClient(null);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nome = String(data.get("nome") ?? "").trim();
    const contato = String(data.get("contato") ?? "").trim();
    const nextErrors: Partial<Record<ClientFormField, string>> = {};

    setError("");
    setFieldErrors({});
    if (!nome) nextErrors.nome = "Informe o nome do cliente.";
    if (contato.length > 240) nextErrors.contato = "O contato deve ter até 240 caracteres.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      const response = await fetch(editingId ? `/api/clients/${editingId}` : "/api/clients", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, contato }),
      });
      const result = await response.json() as Client | { error?: string };
      if (!response.ok) {
        const message = "error" in result ? result.error || "Não foi possível salvar o cliente." : "Não foi possível salvar o cliente.";
        if (response.status === 409) setFieldErrors({ nome: message });
        else setError(message);
        return;
      }
      form.reset();
      closeModal();
      setSuccess(editingId ? "Cliente atualizado." : "Cliente cadastrado.");
      await loadClients();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao salvar cliente.");
    } finally {
      setPending(false);
    }
  }

  async function removeClient() {
    if (!selectedClient) return;
    setConfirmPending(true);
    setError("");
    try {
      const response = await fetch(`/api/clients/${selectedClient.id}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir o cliente.");
      closeConfirm();
      setSuccess("Cliente excluído.");
      await loadClients();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao excluir cliente.");
    } finally {
      setConfirmPending(false);
    }
  }

  const filteredClients = clients.filter((client) => client.nome.toLowerCase().includes(search.trim().toLowerCase()));
  const inputIcon = (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-muted">
      <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.6" />
      <path d="m12.5 12.5 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );

  return (
    <section className="page-enter">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-xl font-semibold text-[#12358A]">Clientes</h1>
        <button type="button" onClick={() => openModal()} className="inline-flex h-9 items-center rounded-md bg-[#16A34A] px-3 text-sm font-medium text-white transition-colors hover:bg-[#15803D]">Novo cliente</button>
      </div>

      <div className="mb-5 w-full max-w-[320px]">
        <label htmlFor="client-search" className="sr-only">Buscar cliente por nome</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center">{inputIcon}</span>
          <input id="client-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome" aria-label="Buscar cliente por nome" className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none placeholder:text-muted focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20" />
        </div>
      </div>

      {(error || success) && <p role={error ? "alert" : "status"} className={`mb-5 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{error || success}</p>}

      <section className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        {loading ? (
          <p className="px-5 py-8 text-sm text-muted">Carregando clientes…</p>
        ) : clients.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="m-0 text-sm text-gray-500">Nenhum cliente cadastrado</p>
            <button type="button" onClick={() => openModal()} className="h-9 rounded-md bg-[#16A34A] px-3 text-sm font-medium text-white transition-colors hover:bg-[#15803D]">Novo cliente</button>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center px-6 text-center text-sm text-gray-500">Nenhum cliente encontrado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead className="bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">
                <tr className="h-10 border-b border-[#E5E7EB]">
                  <th scope="col" className="w-[44%] px-4">Nome</th>
                  <th scope="col" className="w-[42%] px-4">Contato</th>
                  <th scope="col" aria-label="Ações" className="w-[14%] px-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="h-[52px] text-sm transition-colors hover:bg-gray-50">
                    <td className="truncate px-4 font-medium text-ink">{client.nome}</td>
                    <td className="truncate px-4 text-gray-600">{client.contato || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => openModal(client)} aria-label={`Editar ${client.nome}`} title="Editar" className="grid h-8 w-8 place-items-center rounded-md border border-transparent text-muted transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fit-blue"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="m13.3 3.3 3.4 3.4-8.3 8.3-4.4 1 1-4.4 8.3-8.3Zm-7.2 11.3h7.7M13.3 3.3l3.4 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                        <button type="button" onClick={() => openConfirm(client)} aria-label={`Excluir ${client.nome}`} title="Excluir" className="grid h-8 w-8 place-items-center rounded-md border border-transparent text-muted transition-colors hover:bg-gray-100 hover:text-[#B91C1C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M3 5h14M7 5V3.7A1.7 1.7 0 0 1 8.7 2h2.6A1.7 1.7 0 0 1 13 3.7V5M6 8v6m4-6v6m4-6v6M5 5l.8 12.3A1.7 1.7 0 0 0 7.5 19h5a1.7 1.7 0 0 0 1.7-1.7L15 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-[#E5E7EB] bg-white px-4 py-3 text-xs font-medium uppercase tracking-[0.04em] text-gray-500">
          {filteredClients.length === 1 ? "1 cliente" : `${filteredClients.length} clientes`}
        </div>
      </section>

      <Modal isOpen={modalOpen} onClose={closeModal} ariaLabelledBy="client-form-title" contentClassName="w-full max-w-[440px] rounded-lg">
        <header className="border-b border-line px-6 py-5"><h2 id="client-form-title" className="m-0 text-lg font-semibold text-ink">{editingId ? "Editar cliente" : "Novo cliente"}</h2></header>
        <div className="overflow-y-auto px-6 py-5">
          <form id="client-form" noValidate onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="client-name" className="block text-sm font-medium text-ink">Nome <span className="text-red-500">*</span></label>
              <input id="client-name" required name="nome" maxLength={160} defaultValue={editingId ? clients.find((client) => client.id === editingId)?.nome ?? "" : ""} className={fieldClass(Boolean(fieldErrors.nome))} onChange={() => clearFieldError("nome")} />
              {fieldErrors.nome && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.nome}</p>}
            </div>
            <div>
              <label htmlFor="client-contact" className="block text-sm font-medium text-ink">Contato</label>
              <input id="client-contact" name="contato" maxLength={240} defaultValue={editingId ? clients.find((client) => client.id === editingId)?.contato ?? "" : ""} placeholder="E-mail ou telefone" className={fieldClass(Boolean(fieldErrors.contato))} onChange={() => clearFieldError("contato")} />
              {fieldErrors.contato && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.contato}</p>}
            </div>
            {error && <p role="alert" className="m-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </form>
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <button type="button" onClick={closeModal} className="h-10 rounded-md border border-line px-4 text-sm font-medium text-ink hover:bg-gray-50">Cancelar</button>
          <button type="submit" form="client-form" disabled={pending} className="h-10 rounded-md bg-[#16A34A] px-4 text-sm font-medium text-white transition-colors hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Salvando..." : "Salvar"}</button>
        </footer>
      </Modal>

      <Modal isOpen={confirmOpen} onClose={closeConfirm} ariaLabelledBy="client-delete-title" contentClassName="w-full max-w-[440px] rounded-lg" closeOnOutsideClick={true}>
        <div className="px-6 py-5">
          <h2 id="client-delete-title" className="m-0 text-lg font-semibold text-ink">Excluir cliente?</h2>
          {selectedClient && <p className="mb-0 mt-3 text-sm text-gray-600">{selectedClient.nome}</p>}
          {error && <p role="alert" className="mt-4 mb-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <button type="button" onClick={closeConfirm} className="h-10 rounded-md border border-line px-4 text-sm font-medium text-ink hover:bg-gray-50">Cancelar</button>
          <button type="button" onClick={() => void removeClient()} disabled={confirmPending} className="h-10 rounded-md bg-[#B91C1C] px-4 text-sm font-medium text-white transition-colors hover:bg-[#991B1B] disabled:cursor-not-allowed disabled:opacity-60">{confirmPending ? "Excluindo..." : "Excluir"}</button>
        </footer>
      </Modal>
    </section>
  );
}