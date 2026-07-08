"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, KeyRound, Save, X, ShieldCheck, Lock } from "lucide-react";

type U = { id: string; email: string; name: string; role: "admin" | "artista"; activo: boolean; hasPassword: boolean };
type Draft = { id?: string; name?: string; email?: string; role?: "admin" | "artista"; activo?: boolean; password?: string };

export default function UsersAdmin() {
  const [users, setUsers] = useState<U[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [pwFor, setPwFor] = useState<U | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [soyOwner, setSoyOwner] = useState(false);

  async function load() {
    const d = await (await fetch("/api/users")).json();
    setUsers(d.users || []);
  }
  useEffect(() => {
    load();
    fetch("/api/auth").then((r) => r.json()).then((d) => setSoyOwner(!!d.user?.owner)).catch(() => {});
  }, []);

  async function post(body: unknown) {
    setBusy(true);
    try {
      const d = await (await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
      if (d.users) setUsers(d.users);
    } finally { setBusy(false); }
  }

  async function saveUser() {
    if (!editing) return;
    await post({ action: "upsert", item: editing });
    setEditing(null);
  }
  async function savePw() {
    if (!pwFor || pw.length < 6) return;
    await post({ action: "setpw", id: pwFor.id, password: pw });
    setPwFor(null); setPw("");
  }

  if (!users) return <div className="p-6 text-bone-dim">Cargando…</div>;

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-display text-lg text-bone">Usuarios y permisos</div>
          <div className="text-[11px] text-bone-dim">Admin = control total · Artista = su portafolio y agenda.</div>
        </div>
        <button onClick={() => { setPwFor(null); setEditing({ role: "artista", activo: true }); }} className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-sm text-gold-soft hover:bg-gold/20">
          <Plus size={15} /> Nuevo usuario
        </button>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[1fr_340px]">
        <div className="glass space-y-2 overflow-auto rounded-xl p-3">
          {users.map((u) => {
            const locked = u.id === "chato" && !soyOwner;
            return (
            <div key={u.id} className="flex items-center gap-3 rounded-lg border border-line/60 bg-navy-soft px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-sm font-medium text-bone">
                  {u.name || u.email}
                  {u.role === "admin" && <ShieldCheck size={13} className="text-gold" />}
                  {u.id === "chato" && (
                    <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gold">PRODY-G</span>
                  )}
                </div>
                <div className="truncate text-[11px] text-bone-dim">{u.email}</div>
              </div>
              <span className="rounded-full border border-line px-2 py-0.5 text-[10px] text-bone-dim">{u.role}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] ${u.hasPassword ? "bg-[#3FB37F]/15 text-[#3FB37F]" : "bg-[#D8A24A]/15 text-[#D8A24A]"}`}>
                {u.hasPassword ? "activa" : "sin clave"}
              </span>
              {locked ? (
                <span title="Este usuario solo lo administra PRODY-G" className="text-bone-dim/50"><Lock size={15} /></span>
              ) : (
                <>
                  <button onClick={() => { setEditing(null); setPwFor(u); setPw(""); }} title="Asignar contraseña" className="text-bone-dim hover:text-gold-soft"><KeyRound size={15} /></button>
                  <button onClick={() => { setPwFor(null); setEditing({ id: u.id, name: u.name, email: u.email, role: u.role, activo: u.activo }); }} className="text-bone-dim hover:text-gold-soft"><Pencil size={15} /></button>
                  <button onClick={() => { if (confirm("¿Eliminar usuario?")) post({ action: "delete", id: u.id }); }} className="text-bone-dim hover:text-red-400"><Trash2 size={15} /></button>
                </>
              )}
            </div>
          );})}
        </div>

        {(editing || pwFor) && (
          <div className="glass overflow-auto rounded-xl p-4">
            {editing && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-sm text-bone">{editing.id ? "Editar usuario" : "Nuevo usuario"}</span>
                  <button onClick={() => setEditing(null)} className="text-bone-dim hover:text-bone"><X size={16} /></button>
                </div>
                <div className="space-y-3">
                  <Field label="Nombre" value={editing.name || ""} onChange={(v) => setEditing({ ...editing, name: v })} />
                  <Field label="Correo" value={editing.email || ""} onChange={(v) => setEditing({ ...editing, email: v })} />
                  <label className="block">
                    <span className="text-[11px] text-bone-dim">Rol</span>
                    <select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as "admin" | "artista" })}
                      className="mt-1 w-full rounded-lg border border-line bg-navy-soft px-3 py-2 text-sm text-bone outline-none focus:border-gold/50">
                      <option value="artista">Artista</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </label>
                  {!editing.id && <Field label="Contraseña (opcional)" type="password" value={editing.password || ""} onChange={(v) => setEditing({ ...editing, password: v })} />}
                  <button onClick={saveUser} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-soft"><Save size={15} /> Guardar</button>
                </div>
              </>
            )}
            {pwFor && !editing && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-sm text-bone">Contraseña · {pwFor.name}</span>
                  <button onClick={() => { setPwFor(null); setPw(""); }} className="text-bone-dim hover:text-bone"><X size={16} /></button>
                </div>
                <Field label="Nueva contraseña (mín. 6)" type="password" value={pw} onChange={setPw} />
                <button onClick={savePw} disabled={busy || pw.length < 6} className="mt-3 flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-soft disabled:opacity-50"><KeyRound size={15} /> Asignar</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] text-bone-dim">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-navy-soft px-3 py-2 text-sm text-bone outline-none focus:border-gold/50" />
    </label>
  );
}
