"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Perfil, PublicUser } from "@/lib/types";
import { PERFIS } from "@/lib/types";
import { Modal } from "@/components/Modal";

const profileNames: Record<Perfil, string> = { SUPORTE: "Suporte", DEV: "Dev", ADM: "Administrador" };
const profileBadgeStyle: Record<Perfil, string> = {
  ADM: "bg-[#E8EEFB] text-[#12358A]",
  SUPORTE: "bg-[#DCFCE7] text-[#166534]",
  DEV: "bg-[#F3F4F6] text-[#374151]",
};
type UserField = "name" | "username" | "password" | "perfil";

export function UserAdmin() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<UserField, string>>>({});
  const [pending, setPending] = useState(false);

  async function loadUsers() {
    const response = await fetch("/api/users");
    if (response.ok) setUsers(await response.json() as PublicUser[]);
  }

  useEffect(() => { void loadUsers(); }, []);

  function openModal() {
    setFieldErrors({});
    setError("");
    setShowPassword(false);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setFieldErrors({});
    setError("");
    setShowPassword(false);
  }

  function clearFieldError(field: UserField) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError("");
    const form = new FormData(formElement);
    const body = Object.fromEntries(form.entries());
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");
    const perfil = String(body.perfil ?? "");
    const nextErrors: Partial<Record<UserField, string>> = {};
    if (name.length < 2 || name.length > 100) nextErrors.name = "Informe um nome entre 2 e 100 caracteres.";
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) nextErrors.username = "Use de 3 a 40 letras, números, ponto, hífen ou sublinhado.";
    if (password.length < 8 || password.length > 200) nextErrors.password = "A senha deve ter entre 8 e 200 caracteres.";
    if (!PERFIS.includes(perfil as Perfil)) nextErrors.perfil = "Selecione um perfil válido.";
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username, password, perfil }) });
      const result = await response.json() as PublicUser | { error?: string };
      if (!response.ok) {
        const message = "error" in result ? result.error || "Não foi possível cadastrar." : "Não foi possível cadastrar.";
        if (response.status === 409) setFieldErrors({ username: message });
        else setError(message);
        return;
      }
      formElement.reset();
      await loadUsers();
      closeModal();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao cadastrar usuário.");
    } finally {
      setPending(false);
    }
  }

  const inputClass = (invalid: boolean) => `mt-1.5 block h-10 w-full rounded-md border bg-white px-3 text-sm text-ink outline-none transition focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20 ${invalid ? "border-red-400" : "border-line"}`;
  const selectClass = "mt-1.5 block h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20";

  return (
    <section className="page-enter">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-xl font-semibold text-[#12358A]">Usuários</h1>
        <button type="button" onClick={openModal} className="inline-flex h-9 items-center gap-2 rounded-md bg-[#16A34A] px-3 text-sm font-medium text-white transition-colors hover:bg-[#15803D]"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>Novo usuário</button>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] table-fixed border-collapse text-left">
            <thead className="bg-[#F9FAFB] text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-500">
              <tr className="h-10 border-b border-[#E5E7EB]"><th scope="col" className="w-[40%] px-4">Nome</th><th scope="col" className="w-[30%] px-4">Usuário</th><th scope="col" className="w-[25%] px-4">Perfil</th><th scope="col" aria-label="Ações" className="w-[5%] px-3" /></tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {users.length === 0 ? <tr><td colSpan={4} className="h-[52px] px-4 text-sm text-muted">Nenhum usuário cadastrado.</td></tr> : users.map((user) => <tr key={user.id} className="h-[52px] text-sm transition-colors hover:bg-gray-50">
                <td className="truncate px-4 font-medium text-ink">{user.name}</td>
                <td className="truncate px-4 text-gray-600">{user.username}</td>
                <td className="px-4"><span className={`inline-block rounded-[4px] px-2 py-1 text-xs font-medium ${profileBadgeStyle[user.perfil]}`}>{profileNames[user.perfil]}</span></td>
                <td className="px-3" />
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} ariaLabelledBy="new-user-title" contentClassName="w-full max-w-[440px]">
        <header className="border-b border-line px-6 py-5"><h2 id="new-user-title" className="m-0 text-lg font-semibold text-ink">Novo usuário</h2></header>
        <div className="overflow-y-auto px-6 py-5">
          <form id="new-user-form" noValidate onSubmit={submit} className="space-y-4">
            <div><label htmlFor="user-name" className="block text-sm font-medium text-ink">Nome</label><input id="user-name" required name="name" minLength={2} maxLength={100} className={inputClass(Boolean(fieldErrors.name))} onChange={() => clearFieldError("name")} />{fieldErrors.name && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.name}</p>}</div>
            <div><label htmlFor="user-username" className="block text-sm font-medium text-ink">Usuário</label><input id="user-username" required name="username" minLength={3} maxLength={40} pattern="[a-zA-Z0-9._-]+" autoComplete="off" className={inputClass(Boolean(fieldErrors.username))} onChange={() => clearFieldError("username")} />{fieldErrors.username && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.username}</p>}</div>
            <div><label htmlFor="user-password" className="block text-sm font-medium text-ink">Senha</label><div className="relative"><input id="user-password" required name="password" type={showPassword ? "text" : "password"} minLength={8} maxLength={200} autoComplete="new-password" className={`${inputClass(Boolean(fieldErrors.password))} pr-11`} onChange={() => clearFieldError("password")} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fit-blue">{showPassword ? <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M3 3 17 17M8.6 8.7a2 2 0 0 0 2.7 2.7M7.2 5.4A8 8 0 0 1 10 5c4.2 0 6.8 5 6.8 5a11 11 0 0 1-2.1 2.8M5.1 6.1C3.3 7.4 2 10 2 10s2.6 5 8 5c.8 0 1.6-.1 2.3-.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> : <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M2 10s2.6-5 8-5 8 5 8 5-2.6 5-8 5-8-5-8-5Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" /></svg>}</button></div><p className="mb-0 mt-1 text-xs text-muted">Mínimo de 8 caracteres</p>{fieldErrors.password && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.password}</p>}</div>
            <div><label htmlFor="user-profile" className="block text-sm font-medium text-ink">Perfil</label><select id="user-profile" name="perfil" defaultValue="SUPORTE" className={selectClass} onChange={() => clearFieldError("perfil")}>{PERFIS.map((profile) => <option key={profile} value={profile}>{profileNames[profile]}</option>)}</select>{fieldErrors.perfil && <p className="mb-0 mt-1 text-xs text-red-600">{fieldErrors.perfil}</p>}</div>
            {error && <p role="alert" className="m-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </form>
        </div>
        <footer className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <button type="button" onClick={closeModal} className="h-10 rounded-md border border-line px-4 text-sm font-medium text-ink hover:bg-gray-50">Cancelar</button>
          <button type="submit" form="new-user-form" disabled={pending} className="h-10 rounded-md bg-[#16A34A] px-4 text-sm font-medium text-white transition-colors hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Cadastrando..." : "Cadastrar usuário"}</button>
        </footer>
      </Modal>
    </section>
  );
}