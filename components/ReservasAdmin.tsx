"use client";

import { useEffect, useState } from "react";
import { Trash2, RefreshCw, MessageCircle } from "lucide-react";

type Lead = { id: string; nombre: string; contacto: string; servicio: string; presupuesto: string; idea: string; fecha: string; estado: string; origen: string };

const ESTADOS = ["nuevo", "contactado", "agendado", "descartado"];
const COLOR: Record<string, string> = { nuevo: "#5B8CB7", contactado: "#C5A059", agendado: "#3FB37F", descartado: "#8a8a8a" };

export default function ReservasAdmin() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/lead");
    if (r.ok) { const d = await r.json(); setLeads(d.leads || []); }
    else setLeads([]);
  }
  useEffect(() => { load(); }, []);

  async function patch(body: unknown) {
    setBusy(true);
    try {
      const d = await (await fetch("/api/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
      if (d.leads) setLeads(d.leads);
    } finally { setBusy(false); }
  }

  function waLink(contacto: string) {
    const digits = (contacto || "").replace(/\D/g, "");
    if (digits.length < 7) return null;
    return "https://wa.me/" + (digits.startsWith("57") ? digits : "57" + digits);
  }

  if (!leads) return <div className="p-6 text-bone-dim">Cargando…</div>;

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="font-display text-lg text-bone">Reservas · Leads de la web</div>
          <div className="text-[11px] text-bone-dim">{leads.length} solicitud(es) desde lastrulestattoo.com</div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-line bg-navy-soft px-3 py-1.5 text-sm text-bone-dim hover:text-bone">
          <RefreshCw size={15} /> Refrescar
        </button>
      </div>

      <div className="glass flex-1 space-y-2 overflow-auto rounded-xl p-3">
        {leads.length === 0 ? (
          <p className="p-4 text-sm text-bone-dim">Aún no hay reservas. Cuando alguien llene el formulario de la web, aparece aquí.</p>
        ) : (
          leads.map((l) => {
            const wa = waLink(l.contacto);
            return (
              <div key={l.id} className="rounded-lg border border-line/60 bg-navy-soft p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-bone">{l.nombre || "(sin nombre)"}</div>
                    <div className="text-[12px] text-gold-soft">{l.contacto}</div>
                    <div className="mt-1 text-[12px] text-bone-dim">{l.servicio}{l.presupuesto ? " · " + l.presupuesto : ""}</div>
                    {l.idea && <div className="mt-1 text-[12px] text-bone">“{l.idea}”</div>}
                    <div className="mt-1 text-[10px] text-bone-dim">{new Date(l.fecha).toLocaleString("es-CO")}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <select
                      value={l.estado}
                      onChange={(e) => patch({ action: "update", id: l.id, patch: { estado: e.target.value } })}
                      disabled={busy}
                      className="rounded-md border px-2 py-1 text-[11px] outline-none"
                      style={{ borderColor: (COLOR[l.estado] || "#888") + "66", color: COLOR[l.estado] || "#fff", background: "#0f1522" }}
                    >
                      {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex gap-2">
                      {wa && <a href={wa} target="_blank" rel="noreferrer" className="text-[#25D366] hover:opacity-80" title="Escribir por WhatsApp"><MessageCircle size={16} /></a>}
                      <button onClick={() => { if (confirm("¿Eliminar reserva?")) patch({ action: "delete", id: l.id }); }} className="text-bone-dim hover:text-red-400"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
