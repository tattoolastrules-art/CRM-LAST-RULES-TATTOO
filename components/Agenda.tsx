"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Clock, Check, RefreshCw, Plus, HeartPulse } from "lucide-react";
import FollowupsPanel from "./FollowupsPanel";
import {
  MAESTROS,
  HOURS,
  DAY_NAMES,
  mondayOf,
} from "@/lib/agenda";

interface GEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface CitaReal {
  id: string; maestroId: string; coleccionista: string; pieza: string;
  fecha: string; start: number; durHours: number; tipo: string; abono: boolean;
  estilo?: string;
}
type CitaForm = Omit<CitaReal, "id" | "tipo"> & { tipo: "sesion" | "asesoria" };

const PALETA = ["#C5A059", "#5B8CB7", "#8E7CC3", "#3FB37F", "#D8A24A", "#E1306C", "#37C7C0", "#B75B5B"];
const ESTILOS = ["Realismo", "Fine line", "Blackwork", "Neo tradicional", "Lettering", "Cover up", "Color", "Freehand", "Sombras", "Piercing", "Otro"];

function isoDe(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Agenda() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [gStatus, setGStatus] = useState<{ connected: boolean; configured: boolean } | null>(null);
  const [gEvents, setGEvents] = useState<GEvent[]>([]);
  const [gMsg, setGMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSeg, setShowSeg] = useState(false);
  const [citas, setCitas] = useState<CitaReal[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [syncG, setSyncG] = useState(true);
  const [form, setForm] = useState<CitaForm>({ coleccionista: "", pieza: "", maestroId: MAESTROS[0].id, fecha: "", start: 14, durHours: 2, tipo: "sesion", abono: false, estilo: "" });
  const [artistas, setArtistas] = useState<{ id: string; nombre: string; color: string }[]>([]);

  // Tatuadores REALES (los mismos del Sitio; colores asignados por orden)
  useEffect(() => {
    fetch("/api/content")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        const lista = ((c?.tatuadores || []) as { id: string; nombre: string; activo?: boolean }[])
          .filter((t) => t.activo !== false)
          .map((t, i) => ({ id: t.id, nombre: t.nombre, color: PALETA[i % PALETA.length] }));
        if (lista.length) {
          setArtistas(lista);
          setForm((f) => ({ ...f, maestroId: lista[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  const lista = artistas.length ? artistas : MAESTROS.map((m) => ({ id: m.id, nombre: m.name, color: m.color }));
  const artistaDe = (id: string) => lista.find((a) => a.id === id) ?? { id, nombre: id, color: "#C5A059" };

  const monday = mondayOf();
  const dayDate = (i: number) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.getDate();
  };

  // estado de Google + ?gcal=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("gcal");
    if (q === "connected") setGMsg("Google Calendar conectado ✓");
    if (q === "error") setGMsg("No se pudo conectar Google Calendar");
    fetch("/api/google/status")
      .then((r) => r.json())
      .then((s) => {
        setGStatus(s);
        if (s.connected) loadEvents();
      })
      .catch(() => setGStatus({ connected: false, configured: false }));
    fetch("/api/citas").then((r) => (r.ok ? r.json() : null)).then((d) => d && setCitas(d.citas || [])).catch(() => {});
  }, []);

  async function guardarCita() {
    if (!form.coleccionista.trim() || !form.fecha) { alert("Pon al menos el nombre y la fecha."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/citas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upsert", item: form }) });
      const d = await r.json();
      if (!r.ok) { alert(d.error || "No se pudo guardar"); return; }
      setCitas(d.citas || []);
      // sincroniza con Google Calendar si está conectado
      if (syncG && gStatus?.connected) {
        const ini = new Date(form.fecha + "T" + String(form.start).padStart(2, "0") + ":00:00");
        const fin = new Date(ini.getTime() + form.durHours * 3600e3);
        fetch("/api/google/events", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: "LAST RULES · " + form.coleccionista + (form.pieza ? " — " + form.pieza : ""),
            description: [form.tipo === "asesoria" ? "Asesoría" : "Sesión", form.estilo, artistaDe(form.maestroId).nombre].filter(Boolean).join(" · "),
            start: { dateTime: ini.toISOString() }, end: { dateTime: fin.toISOString() },
          }),
        }).then(() => loadEvents()).catch(() => {});
      }
      setShowNew(false);
      setForm({ coleccionista: "", pieza: "", maestroId: lista[0]?.id || MAESTROS[0].id, fecha: "", start: 14, durHours: 2, tipo: "sesion", abono: false, estilo: "" });
    } finally { setBusy(false); }
  }

  async function borrarCita(id: string) {
    if (!confirm("¿Eliminar esta cita?")) return;
    const r = await fetch("/api/citas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    if (r.ok) setCitas((await r.json()).citas || []);
  }

  async function loadEvents() {
    setBusy(true);
    try {
      const r = await fetch("/api/google/events");
      const d = await r.json();
      if (r.ok) setGEvents(d.items ?? []);
      else setGMsg(d.error || "Error leyendo eventos");
    } finally {
      setBusy(false);
    }
  }

  async function createTest() {
    setBusy(true);
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(16, 0, 0, 0);
    const end = new Date(start);
    end.setHours(17, 0, 0, 0);
    try {
      const r = await fetch("/api/google/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: "LAST RULES · Sesión de prueba",
          description: "Creada desde Last Rules OS 🖤",
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setGMsg("Cita de prueba creada en tu Google Calendar ✓");
        loadEvents();
      } else setGMsg(d.error || "Error creando evento");
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setHidden((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // mapea un evento de Google a la grilla de esta semana
  function gridPos(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = Math.floor((+dayStart - +monday) / 86400000);
    const hour = d.getHours();
    if (day < 0 || day > 6) return null;
    if (hour < HOURS[0] || hour > HOURS[HOURS.length - 1]) return null;
    return { day, hour, date: d };
  }

  return (
    <div className="relative flex h-full flex-col p-5">
      {showSeg && <FollowupsPanel onClose={() => setShowSeg(false)} />}

      {/* Modal: nueva cita manual */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowNew(false)}>
          <div className="glass w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm text-bone">Nueva cita</span>
              <button onClick={() => setShowNew(false)} className="text-bone-dim hover:text-bone">✕</button>
            </div>
            <div className="space-y-2.5">
              <input value={form.coleccionista} onChange={(e) => setForm({ ...form, coleccionista: e.target.value })} placeholder="Nombre del cliente *"
                className="w-full rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50" />
              <input value={form.pieza} onChange={(e) => setForm({ ...form, pieza: e.target.value })} placeholder="tatuaje / descripción"
                className="w-full rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50" />
              <select value={form.maestroId} onChange={(e) => setForm({ ...form, maestroId: e.target.value })}
                className="w-full rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none">
                {lista.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <select value={form.estilo} onChange={(e) => setForm({ ...form, estilo: e.target.value })}
                className="w-full rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none">
                <option value="">Estilo / tipo de tatuaje…</option>
                {ESTILOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex gap-2">
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="flex-1 rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none" />
                <select value={form.start} onChange={(e) => setForm({ ...form, start: Number(e.target.value) })}
                  className="rounded-lg border border-line bg-navy px-2 py-2 text-sm text-bone outline-none">
                  {HOURS.map((h) => <option key={h} value={h}>{h}:00</option>)}
                </select>
                <select value={form.durHours} onChange={(e) => setForm({ ...form, durHours: Number(e.target.value) })}
                  className="rounded-lg border border-line bg-navy px-2 py-2 text-sm text-bone outline-none">
                  {[1, 2, 3, 4, 5, 6, 8].map((h) => <option key={h} value={h}>{h}h</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 text-[12px] text-bone-dim">
                <label className="flex items-center gap-1.5"><input type="radio" checked={form.tipo === "sesion"} onChange={() => setForm({ ...form, tipo: "sesion" })} className="accent-gold" /> Sesión</label>
                <label className="flex items-center gap-1.5"><input type="radio" checked={form.tipo === "asesoria"} onChange={() => setForm({ ...form, tipo: "asesoria" })} className="accent-gold" /> Asesoría</label>
                {form.tipo === "sesion" && (
                  <label className="ml-auto flex items-center gap-1.5"><input type="checkbox" checked={form.abono} onChange={(e) => setForm({ ...form, abono: e.target.checked })} className="accent-gold" /> Abono recibido</label>
                )}
              </div>
              {gStatus?.connected && (
                <label className="flex items-center gap-1.5 text-[12px] text-bone-dim">
                  <input type="checkbox" checked={syncG} onChange={(e) => setSyncG(e.target.checked)} className="accent-gold" /> Crear también en Google Calendar
                </label>
              )}
              <button onClick={guardarCita} disabled={busy} className="w-full rounded-lg bg-gold py-2.5 text-sm font-semibold text-navy hover:bg-gold-soft disabled:opacity-50">
                {busy ? "Guardando…" : "Guardar cita"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-lg text-bone">Agenda · Tatuadores</div>
          <div className="text-[11px] text-bone-dim">
            Semana del {monday.getDate()} ·{" "}
            {monday.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-navy hover:bg-gold-soft"
          >
            <Plus size={15} /> Nueva cita
          </button>
          <button
            onClick={() => setShowSeg((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-navy-soft px-3 py-1.5 text-sm text-bone-dim hover:text-bone"
          >
            <HeartPulse size={15} /> Seguimientos
          </button>
          {gStatus?.connected ? (
            <>
              <span className="flex items-center gap-1 rounded-lg bg-[#3FB37F]/15 px-3 py-1.5 text-sm text-[#3FB37F]">
                <Check size={15} /> Google Calendar
              </span>
              <button
                onClick={loadEvents}
                disabled={busy}
                title="Refrescar"
                className="rounded-lg border border-line bg-navy-soft p-1.5 text-bone-dim hover:text-bone"
              >
                <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
              </button>
              <button
                onClick={createTest}
                disabled={busy}
                className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-sm text-gold-soft hover:bg-gold/20"
              >
                <Plus size={14} /> Cita de prueba
              </button>
            </>
          ) : (
            <a
              href="/api/google/auth"
              className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-sm text-gold-soft transition hover:bg-gold/20"
            >
              <CalendarPlus size={15} /> Conectar Google Calendar
            </a>
          )}
        </div>
      </div>

      {gMsg && (
        <div className="mb-3 rounded-lg border border-gold/20 bg-navy-soft px-3 py-1.5 text-xs text-gold-soft">
          {gMsg}
          {gStatus && !gStatus.configured && (
            <span className="text-bone-dim">
              {" "}
              · Falta configurar GOOGLE_CLIENT_ID en .env.local (ver
              docs/google-calendar-setup.md)
            </span>
          )}
        </div>
      )}

      {/* Filtro de tatuadores */}
      <div className="mb-3 flex flex-wrap gap-2">
        {lista.map((m) => (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
              hidden.has(m.id) ? "opacity-40" : ""
            }`}
            style={{ borderColor: m.color + "66", color: m.color }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
            {m.nombre}
          </button>
        ))}
        {gStatus?.connected && (
          <span className="flex items-center gap-1.5 rounded-full border border-[#3FB37F]/50 px-2.5 py-1 text-xs text-[#3FB37F]">
            <span className="h-2.5 w-2.5 rounded-full border border-dashed border-[#3FB37F]" />
            Google ({gEvents.length})
          </span>
        )}
      </div>

      {/* Calendario semanal */}
      <div className="glass flex-1 overflow-auto rounded-xl p-2">
        <div
          className="grid min-w-[760px]"
          style={{ gridTemplateColumns: "56px repeat(7, 1fr)", gridAutoRows: "56px" }}
        >
          <div />
          {DAY_NAMES.map((d, i) => (
            <div
              key={d}
              className="flex flex-col items-center justify-center border-b border-line/50 pb-1"
            >
              <span className="text-[11px] text-bone-dim">{d}</span>
              <span className="text-sm font-semibold text-bone">{dayDate(i)}</span>
            </div>
          ))}

          {HOURS.map((h, r) => (
            <Row key={h} hour={h} rowIndex={r} />
          ))}

          {/* citas REALES creadas con + Nueva cita */}
          {citas.map((c) => {
            let day = -1;
            for (let i = 0; i < 7; i++) { const dd = new Date(monday); dd.setDate(dd.getDate() + i); if (isoDe(dd) === c.fecha) { day = i; break; } }
            if (day < 0 || c.start < HOURS[0] || c.start > HOURS[HOURS.length - 1]) return null;
            const m = artistaDe(c.maestroId);
            if (hidden.has(m.id)) return null;
            const row = c.start - HOURS[0] + 2;
            return (
              <div
                key={"real-" + c.id}
                className="group relative m-0.5 overflow-hidden rounded-md px-2 py-1 text-[11px] leading-tight"
                style={{ gridColumn: day + 2, gridRow: `${row} / span ${c.durHours}`, background: m.color + "33", borderLeft: `3px solid ${m.color}` }}
              >
                <button onClick={() => borrarCita(c.id)} className="absolute right-1 top-0.5 hidden text-white/50 hover:text-red-400 group-hover:block">✕</button>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-bone">{c.coleccionista}</span>
                  {c.tipo === "asesoria" ? (
                    <span className="text-[9px] text-bone-dim">asesoría</span>
                  ) : (
                    <span className="text-[9px]" style={{ color: c.abono ? "#3FB37F" : "#D8A24A" }}>{c.abono ? "abono ✓" : "abono pend."}</span>
                  )}
                </div>
                <div className="truncate" style={{ color: m.color }}>{[c.estilo, c.pieza].filter(Boolean).join(" · ")}</div>
                <div className="flex items-center gap-1 text-[9px] text-bone-dim">
                  <Clock size={9} /> {c.start}:00–{c.start + c.durHours}:00 · {m.nombre}
                </div>
              </div>
            );
          })}

          {/* eventos reales de Google (borde punteado verde) */}
          {gEvents.map((e) => {
            const pos = gridPos(e.start?.dateTime);
            if (!pos) return null;
            const endH = e.end?.dateTime ? new Date(e.end.dateTime).getHours() : pos.hour + 1;
            const dur = Math.max(1, Math.min(endH, HOURS[HOURS.length - 1] + 1) - pos.hour);
            return (
              <div
                key={e.id}
                className="m-0.5 overflow-hidden rounded-md border border-dashed px-2 py-1 text-[11px] leading-tight"
                style={{
                  gridColumn: pos.day + 2,
                  gridRow: `${pos.hour - HOURS[0] + 2} / span ${dur}`,
                  borderColor: "#3FB37F",
                  background: "#3FB37F18",
                }}
              >
                <div className="truncate font-medium text-[#9fe7c6]">
                  {e.summary || "(evento)"}
                </div>
                <div className="text-[9px] text-[#3FB37F]">Google Calendar</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ hour, rowIndex }: { hour: number; rowIndex: number }) {
  return (
    <>
      <div
        className="pr-2 pt-1 text-right text-[10px] text-bone-dim"
        style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
      >
        {hour}:00
      </div>
      {Array.from({ length: 7 }).map((_, c) => (
        <div
          key={c}
          className="border-b border-l border-line/30"
          style={{ gridColumn: c + 2, gridRow: rowIndex + 2 }}
        />
      ))}
    </>
  );
}
