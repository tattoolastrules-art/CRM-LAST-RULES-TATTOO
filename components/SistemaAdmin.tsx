"use client";

import { useEffect, useState } from "react";
import { Power, ShieldCheck, Sparkles } from "lucide-react";

const MODULOS = [
  { id: "flujos", label: "Flujos", desc: "Constructor de conversaciones" },
  { id: "omni", label: "Omnicanal", desc: "Inbox estilo WhatsApp" },
  { id: "crm", label: "CRM", desc: "Dashboard de Coleccionistas" },
  { id: "reservas", label: "Reservas", desc: "Leads de la web y WhatsApp" },
  { id: "planner", label: "Planner", desc: "Planificador de marketing" },
  { id: "agenda", label: "Agenda", desc: "Calendario de Los Maestros" },
  { id: "sitio", label: "Sitio", desc: "Contenido de la web pública" },
];

// Ideas de evolución del sistema (requieren desarrollo de PRODY-G)
const IDEAS = [
  "Ana podría entender las fotos de referencia que envían los Coleccionistas y describirlas al Maestro.",
  "Recordatorios automáticos de cita por WhatsApp 24h y 2h antes — menos inasistencias.",
  "Reporte semanal automático de leads y cierres directo al WhatsApp del equipo.",
  "El Planner podría sugerir ideas de contenido con IA según tendencias de tatuaje.",
  "Catálogo Flash Day con reserva y abono en línea desde la web.",
  "Panel de métricas de Ana: cuántas conversaciones cierra sola por semana.",
  "Encuesta post-sesión automática y reseñas de Google con un clic.",
];

export default function SistemaAdmin() {
  const [mods, setMods] = useState<Record<string, boolean> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => (r.ok ? r.json() : null)).then((s) => s && setMods(s.modules || {})).catch(() => {});
  }, []);

  async function toggle(id: string) {
    if (!mods) return;
    const next = { ...mods, [id]: !(mods[id] ?? true) };
    setMods(next);
    setBusy(true);
    try {
      const r = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modules: next }) });
      if (!r.ok) { setMods(mods); alert("Solo PRODY-G puede administrar módulos."); }
    } finally { setBusy(false); }
  }

  if (!mods) return <div className="p-6 text-bone-dim">Cargando…</div>;

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck size={18} className="text-gold" />
        <div>
          <div className="font-display text-lg text-bone">Sistema · Control PRODY-G</div>
          <div className="text-[11px] text-bone-dim">Enciende o apaga módulos del OS. Los cambios aplican para todos los usuarios al recargar.</div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map((m) => {
          const on = mods[m.id] ?? true;
          return (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              disabled={busy}
              className={`glass flex items-center justify-between rounded-xl p-4 text-left transition hover:-translate-y-0.5 ${on ? "" : "opacity-60"}`}
            >
              <div>
                <div className="text-sm font-semibold text-bone">{m.label}</div>
                <div className="text-[11px] text-bone-dim">{m.desc}</div>
              </div>
              <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${on ? "bg-[#3FB37F]/15 text-[#3FB37F]" : "bg-line/40 text-bone-dim"}`}>
                <Power size={12} /> {on ? "ON" : "OFF"}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-bone-dim">
          <Sparkles size={13} className="text-gold" /> Evoluciones posibles del sistema
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {IDEAS.map((idea, i) => (
            <div key={i} className="rounded-lg border border-gold/15 bg-navy-soft px-3 py-2 text-[12px] text-bone-dim">
              💡 {idea} <span className="text-[10px] text-gold-soft/70">— desarrollo PRODY-G</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
