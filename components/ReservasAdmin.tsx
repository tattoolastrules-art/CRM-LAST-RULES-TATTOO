"use client";

import { useEffect, useState } from "react";
import { Trash2, RefreshCw, MessageCircle, CalendarPlus, Download, Bell } from "lucide-react";

type Lead = {
  id: string; nombre: string; contacto: string; servicio: string; presupuesto: string;
  idea: string; fecha: string; estado: string; origen: string;
  notas?: string; maestro?: string; fechaCita?: string;
};

const ESTADOS = ["nuevo", "contactado", "agendado", "descartado"];
const COLOR: Record<string, string> = { nuevo: "#5B8CB7", contactado: "#C5A059", agendado: "#3FB37F", descartado: "#8a8a8a" };

export default function ReservasAdmin() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [maestros, settatuadores] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [anova, setAnova] = useState<boolean | null>(null);

  async function load() {
    const r = await fetch("/api/lead");
    setLeads(r.ok ? (await r.json()).leads || [] : []);
  }
  useEffect(() => {
    load();
    fetch("/api/content").then((r) => r.json()).then((c) => settatuadores((c.tatuadores || []).map((t: { nombre: string }) => t.nombre))).catch(() => {});
    fetch("/api/settings").then((r) => (r.ok ? r.json() : null)).then((s) => s && setAnova(!!s.anovaAuto)).catch(() => {});
  }, []);

  async function toggleAnova() {
    const next = !anova;
    setAnova(next);
    const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ anovaAuto: next }) });
    if (!r.ok) { setAnova(!next); alert("Solo el administrador puede cambiar esto."); }
  }

  async function patch(body: unknown) {
    setBusy(true);
    try {
      const d = await (await fetch("/api/lead", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })).json();
      if (d.leads) setLeads(d.leads);
    } finally { setBusy(false); }
  }
  const upd = (id: string, p: Partial<Lead>) => patch({ action: "update", id, patch: p });

  function waLink(c: string) {
    const d = (c || "").replace(/\D/g, "");
    return d.length < 7 ? null : "https://wa.me/" + (d.startsWith("57") ? d : "57" + d);
  }

  async function agendar(l: Lead) {
    if (!l.fechaCita) { alert("Primero elige fecha y hora de la cita."); return; }
    const start = new Date(l.fechaCita);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    try {
      const r = await fetch("/api/google/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: "LAST RULES · " + (l.nombre || "Cita") + (l.maestro ? " — " + l.maestro : ""),
          description: [l.servicio, l.idea, "Contacto: " + l.contacto].filter(Boolean).join("\n"),
          start: { dateTime: start.toISOString() }, end: { dateTime: end.toISOString() },
        }),
      });
      await upd(l.id, { estado: "agendado" });
      alert(r.ok ? "Cita creada en Google Calendar ✓" : "Marcada como agendada. Conecta Google Calendar (pestaña Agenda) para sincronizarla.");
    } catch { alert("Error de conexión"); }
  }

  function exportCSV() {
    if (!leads || !leads.length) return;
    const cols = ["fecha", "nombre", "contacto", "servicio", "presupuesto", "idea", "estado", "maestro", "fechaCita", "notas", "origen"];
    const esc = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const csv = [cols.join(",")].concat(leads.map((l) => cols.map((c) => esc((l as Record<string, unknown>)[c])).join(","))).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = "reservas-lastrules.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  if (!leads) return <div className="p-6 text-bone-dim">Cargando…</div>;
  const nuevas = leads.filter((l) => l.estado === "nuevo").length;

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-display text-lg text-bone">
            Reservas · Leads de la web
            {nuevas > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-[#5B8CB7]/20 px-2 py-0.5 text-[11px] font-medium text-[#7FB0E0]">
                <Bell size={11} /> {nuevas} nueva{nuevas > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="text-[11px] text-bone-dim">{leads.length} solicitud(es) desde lastrulestattoo.com</div>
        </div>
        <div className="flex items-center gap-2">
          {anova !== null && (
            <button
              onClick={toggleAnova}
              title="Respuestas automáticas de NOVA/Ana en WhatsApp"
              className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${anova ? "border-[#37C7C0]/50 bg-[#37C7C0]/10 text-[#37C7C0]" : "border-line bg-navy-soft text-bone-dim"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${anova ? "bg-[#37C7C0]" : "bg-line"}`} />
              NOVA {anova ? "ON" : "OFF"}
            </button>
          )}
          <button onClick={exportCSV} className="flex items-center gap-1.5 rounded-lg border border-line bg-navy-soft px-3 py-1.5 text-sm text-bone-dim hover:text-bone"><Download size={15} /> CSV</button>
          <button onClick={load} className="flex items-center gap-1.5 rounded-lg border border-line bg-navy-soft px-3 py-1.5 text-sm text-bone-dim hover:text-bone"><RefreshCw size={15} /> Refrescar</button>
        </div>
      </div>

      <div className="glass flex-1 space-y-2.5 overflow-auto rounded-xl p-3">
        {leads.length === 0 ? (
          <p className="p-4 text-sm text-bone-dim">Aún no hay reservas. Cuando alguien llene el formulario de la web, aparece aquí.</p>
        ) : (
          leads.map((l) => {
            const wa = waLink(l.contacto);
            return (
              <div key={l.id} className="rounded-lg border border-line/60 bg-navy-soft p-3" style={l.estado === "nuevo" ? { boxShadow: "inset 3px 0 0 #5B8CB7" } : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-bone">{l.nombre || "(sin nombre)"}</div>
                    <div className="text-[12px] text-gold-soft">{l.contacto}</div>
                    <div className="mt-0.5 text-[12px] text-bone-dim">{l.servicio}{l.presupuesto ? " · " + l.presupuesto : ""}</div>
                    {l.idea && <div className="mt-0.5 text-[12px] text-bone">“{l.idea}”</div>}
                    <div className="mt-0.5 text-[10px] text-bone-dim">{new Date(l.fecha).toLocaleString("es-CO")}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {wa && <a href={wa} target="_blank" rel="noreferrer" className="text-[#25D366] hover:opacity-80" title="WhatsApp"><MessageCircle size={17} /></a>}
                    <button onClick={() => { if (confirm("¿Eliminar reserva?")) patch({ action: "delete", id: l.id }); }} className="text-bone-dim hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line/40 pt-2.5">
                  <select value={l.estado} onChange={(e) => upd(l.id, { estado: e.target.value })} disabled={busy}
                    className="rounded-md border px-2 py-1 text-[11px] outline-none" style={{ borderColor: (COLOR[l.estado] || "#888") + "66", color: COLOR[l.estado] || "#fff", background: "#0f1522" }}>
                    {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>

                  <select value={l.maestro || ""} onChange={(e) => upd(l.id, { maestro: e.target.value })} disabled={busy}
                    className="rounded-md border border-line bg-[#0f1522] px-2 py-1 text-[11px] text-bone-dim outline-none">
                    <option value="">Asignar tatuador…</option>
                    {maestros.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>

                  <input type="datetime-local" defaultValue={l.fechaCita || ""} onBlur={(e) => upd(l.id, { fechaCita: e.target.value })}
                    className="rounded-md border border-line bg-[#0f1522] px-2 py-1 text-[11px] text-bone-dim outline-none" />
                  <button onClick={() => agendar(l)} className="flex items-center gap-1 rounded-md border border-[#3FB37F]/40 bg-[#3FB37F]/10 px-2 py-1 text-[11px] text-[#3FB37F] hover:bg-[#3FB37F]/20"><CalendarPlus size={13} /> Agendar</button>

                  <input defaultValue={l.notas || ""} placeholder="Nota…" onBlur={(e) => { if (e.target.value !== (l.notas || "")) upd(l.id, { notas: e.target.value }); }}
                    className="min-w-[140px] flex-1 rounded-md border border-line bg-[#0f1522] px-2 py-1 text-[11px] text-bone outline-none placeholder:text-bone-dim/60" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
