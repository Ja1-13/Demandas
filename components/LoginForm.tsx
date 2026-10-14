"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível entrar.");
      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/demands");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao conectar.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main style={{ background: "radial-gradient(circle at 50% 45%, #1C4AB0 0%, #12358A 45%, #0D2A6E 100%)" }} className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="login-square-pattern" width="48" height="48" patternTransform="rotate(12)" patternUnits="userSpaceOnUse">
            <rect x="5" y="5" width="8" height="8" rx="2" fill="white" />
          </pattern>
          <radialGradient id="login-pattern-mask" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="48%" stopColor="white" stopOpacity="0.2" />
            <stop offset="100%" stopColor="white" stopOpacity="0.9" />
          </radialGradient>
          <mask id="login-square-mask"><rect width="1200" height="900" fill="url(#login-pattern-mask)" /></mask>
        </defs>
        <rect width="1200" height="900" fill="url(#login-square-pattern)" opacity="0.05" mask="url(#login-square-mask)" />
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute bottom-6 right-6 h-64 w-64 rounded-md bg-[#22C55E] opacity-[0.1] blur-[100px]" />
      <section className="relative z-10 w-full max-w-[400px] rounded-lg bg-white p-10 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <div className="w-full max-w-[360px]">
          <Image src="/logo.png" alt="FIT" width={180} height={48} priority className="mb-8 h-12 w-auto object-contain object-left" />
          <h1 className="mb-0 text-3xl font-semibold tracking-normal text-[#12358A]">Entrar</h1>
          <p className="mb-0 mt-1 text-sm text-muted">Acesse o sistema de demandas</p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-ink">Usuário</label>
              <input id="username" required autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1.5 block h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20" />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink">Senha</label>
              <div className="relative mt-1.5">
                <input id="password" required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="block h-10 w-full rounded-md border border-line bg-white px-3 pr-11 text-sm text-ink outline-none transition focus:border-fit-blue focus:ring-2 focus:ring-fit-blue/20" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fit-blue">
                  {showPassword ? <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M3 3 17 17M8.6 8.7a2 2 0 0 0 2.7 2.7M7.2 5.4A8 8 0 0 1 10 5c4.2 0 6.8 5 6.8 5a11 11 0 0 1-2.1 2.8M5.1 6.1C3.3 7.4 2 10 2 10s2.6 5 8 5c.8 0 1.6-.1 2.3-.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> : <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M2 10s2.6-5 8-5 8 5 8 5-2.6 5-8 5-8-5-8-5Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" /></svg>}
                </button>
              </div>
            </div>
            {error && <p role="alert" className="m-0 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]">{error}</p>}
            <button type="submit" disabled={pending} className="h-10 w-full rounded-md bg-fit-green px-4 text-sm font-medium text-white transition-colors hover:bg-fit-green-dark disabled:cursor-not-allowed disabled:opacity-60">{pending ? "Entrando..." : "Entrar"}</button>
          </form>
          <p className="mb-0 mt-3 text-center text-xs text-muted">Problemas para acessar? Fale com o administrador.</p>
        </div>
      </section>
      <p className="absolute inset-x-0 bottom-0 mb-0 px-6 pb-6 text-center text-xs text-[#9DB4E8]">FIT Tecnologia</p>
    </main>
  );
}