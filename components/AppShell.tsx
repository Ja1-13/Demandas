"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { Perfil } from "@/lib/types";

interface CurrentUser { name: string; perfil: Perfil }

const profileNames: Record<Perfil, string> = { SUPORTE: "Suporte", DEV: "Desenvolvimento", ADM: "Administrador" };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (pathname === "/login") return;
    fetch("/api/auth/me").then(async (response) => {
      if (!response.ok) return;
      const current = await response.json() as CurrentUser;
      setUser(current);
    }).catch(() => undefined);
  }, [pathname]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  if (pathname === "/login") return <>{children}</>;

  return (
    <>
      <header className="border-b border-fit-blue-dark bg-fit-blue text-white">
        <div className="mx-auto grid min-h-[68px] max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5">
          <Link href="/demands" className="flex items-center gap-3 text-white no-underline">
            <Image src="/logo-fit.png" alt="FIT" width={148} height={40} className="h-10 w-auto object-contain" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white">Demandas</span>
          </Link>
          {user && <nav className="flex min-w-0 items-center justify-self-center gap-1 overflow-x-auto whitespace-nowrap sm:gap-2" aria-label="Navegação principal">
            <Link href="/demands" className={`rounded-md px-3 py-2 text-sm font-medium uppercase tracking-[0.12em] text-white no-underline transition ${pathname === "/demands" ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}>Demandas</Link>
            {(user.perfil === "SUPORTE" || user.perfil === "ADM") && <Link href="/demands/new" className={`rounded-md px-3 py-2 text-sm font-medium uppercase tracking-[0.12em] text-white no-underline transition ${pathname === "/demands/new" ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}>Nova</Link>}
            {user.perfil === "ADM" && <Link href="/admin/users" className={`rounded-md px-3 py-2 text-sm font-medium uppercase tracking-[0.12em] text-white no-underline transition ${pathname.startsWith("/admin") ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}>Usuários</Link>}
            {user.perfil === "ADM" && <Link href="/clients" className={`rounded-md px-3 py-2 text-sm font-medium uppercase tracking-[0.12em] text-white no-underline transition ${pathname.startsWith("/clients") ? "bg-white/20 font-semibold" : "hover:bg-white/10"}`}>Clientes</Link>}
          </nav>}
          <div className="flex items-center gap-3">
            {user && <div className="hidden text-right sm:block"><div className="text-sm font-medium text-white">{user.name}</div><div className="text-[11px] text-white/70">{profileNames[user.perfil]}</div></div>}
            {user && <button type="button" onClick={signOut} title="Sair" aria-label="Sair" className="grid h-9 w-9 place-items-center rounded-md border border-white/30 bg-white/10 text-white transition hover:bg-white/20"><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M8 4H4.5A1.5 1.5 0 0 0 3 5.5v9A1.5 1.5 0 0 0 4.5 16H8m3-3 3-3-3-3m3 3H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></button>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">{children}</main>
    </>
  );
}