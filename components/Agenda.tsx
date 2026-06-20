"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Clock, Check, RefreshCw, Plus } from "lucide-react";
import {
  MAESTROS,
  APPOINTMENTS,
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

export default function Agenda() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [gStatus, setGStatus] = useState<{ connected: boolean; configured: boolean } | null>(null);
  const [gEvents, setGEvents] = useState<GEvent[]>([]);
  const [gMsg, setGMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const monday = mondayOf();
  const dayDate = (i: number) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d.getDate();
  };
  const maestroOf = (id: string) => MAESTROS.find((m) => m.id === id)!;
  const visible = APPOINTMENTS.filter((a) => !hidden.has(a.maestroId));

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
  }, []);

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
    <div className="flex h-full flex-col p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-lg text-bone">Agenda · Los Maestros</div>
          <div className="text-[11px] text-bone-dim">
            Semana del {monday.getDate()} ·{" "}
            {monday.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Filtro de Maestros */}
      <div className="mb-3 flex flex-wrap gap-2">
        {MAESTROS.map((m) => (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
              hidden.has(m.id) ? "opacity-40" : ""
            }`}
            style={{ borderColor: m.color + "66", color: m.color }}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
            {m.name}
            <span className="text-bone-dim">· {m.styles[0]}</span>
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

          {/* citas del estudio (demo) */}
          {visible.map((a) => {
            const m = maestroOf(a.maestroId);
            const row = a.start - HOURS[0] + 2;
            return (
              <div
                key={a.id}
                className="m-0.5 overflow-hidden rounded-md px-2 py-1 text-[11px] leading-tight"
                style={{
                  gridColumn: a.day + 2,
                  gridRow: `${row} / span ${a.durHours}`,
                  background: m.color + "26",
                  borderLeft: `3px solid ${m.color}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-bone">{a.coleccionista}</span>
                  {a.type === "asesoria" ? (
                    <span className="text-[9px] text-bone-dim">asesoría</span>
                  ) : (
                    <span className="text-[9px]" style={{ color: a.abono ? "#3FB37F" : "#D8A24A" }}>
                      {a.abono ? "abono ✓" : "abono pend."}
                    </span>
                  )}
                </div>
                <div className="truncate" style={{ color: m.color }}>
                  {a.pieza}
                </div>
                <div className="flex items-center gap-1 text-[9px] text-bone-dim">
                  <Clock size={9} /> {a.start}:00–{a.start + a.durHours}:00 · {m.name}
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
