"use client";

import { useState } from "react";
import { Logo } from "./Logo";

type AuthUser = { email: string; role: string; name: string };

export default function Login({ onLogin }: { onLogin: (u: AuthUser) => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [mode, setMode] = useState<"login" | "setup">("login");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const action = mode === "setup" ? "setup-admin" : "login";
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, email, password: pw }),
      });
      const d = await r.json();
      if (r.ok && d.user) return onLogin(d.user);
      if (d.error === "sin_contraseña" && d.needsSetup) {
        setMode("setup");
        setErr("Primer acceso: crea tu contraseña de administrador.");
      } else {
        setErr(d.error || "No se pudo iniciar sesión");
      }
    } catch {
      setErr("Error de conexión");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-navy" style={{ fontFamily: "var(--font-montserrat)" }}>
      <form onSubmit={submit} className="glass w-[340px] rounded-2xl p-7">
        <div className="mb-5 flex flex-col items-center">
          <Logo size={56} />
          <div className="mt-3 font-display tracking-widest text-bone">LAST RULES OS</div>
          <div className="text-[11px] text-bone-dim">
            {mode === "setup" ? "Crear contraseña de administrador" : "Acceso al sistema"}
          </div>
        </div>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Correo" required
          className="mb-2 w-full rounded-lg border border-line bg-navy-soft px-3 py-2 text-sm text-bone outline-none focus:border-gold/50" />
        <input value={pw} onChange={(e) => setPw(e.target.value)} type="password"
          placeholder={mode === "setup" ? "Nueva contraseña (mín. 6)" : "Contraseña"} required
          className="mb-3 w-full rounded-lg border border-line bg-navy-soft px-3 py-2 text-sm text-bone outline-none focus:border-gold/50" />
        {err && <div className="mb-3 text-[11px] text-gold-soft">{err}</div>}
        <button disabled={busy} className="w-full rounded-lg bg-gold py-2 text-sm font-semibold text-navy hover:bg-gold-soft">
          {busy ? "…" : mode === "setup" ? "Crear y entrar" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
