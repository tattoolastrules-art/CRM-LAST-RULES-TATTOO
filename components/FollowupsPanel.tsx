"use client";

// Editor del seguimiento automático: confirmación de cita + controles
// post-tatuaje + encuesta. Alejandro edita días y mensajes; ★ = recomendado.

import { useEffect, useState } from "react";
import { Save, Plus, Trash2, X, HeartPulse } from "lucide-react";

type Step = { id: string; dias: number; msg: string };
type Cfg = { confirmMsg: string; steps: Step[]; reviewLink: string };

const RECOMENDADOS = [1, 4, 10, 21, 30];

export default function FollowupsPanel({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    fetch("/api/followups").then((r) => (r.ok ? r.json() : null)).then((d) => d && setCfg(d)).catch(() => {});
  }, []);

  async function save() {
    if (!cfg) return;
    setBusy(true);
    try {
      const r = await fetch("/api/followups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cfg) });
      if (r.ok) { setOk(true); setTimeout(() => setOk(false), 2500); }
      else alert("Solo administradores pueden editar el seguimiento.");
    } finally { setBusy(false); }
  }

  if (!cfg) return null;

  return (
    <div className="glass absolute inset-x-3 top-16 z-30 max-h-[80%] overflow-y-auto rounded-xl p-4 sm:inset-x-auto sm:right-5 sm:w-[520px]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HeartPulse size={16} className="text-gold" />
          <div>
            <div className="text-sm font-semibold text-bone">Seguimiento automático</div>
            <div className="text-[10px] text-bone-dim">Confirmación de cita + control del tatuaje + encuesta · se envían solos por WhatsApp</div>
          </div>
        </div>
        <button onClick={onClose} className="text-bone-dim hover:text-bone"><X size={16} /></button>
      </div>

      <label className="mb-3 block">
        <span className="text-[11px] text-bone-dim">Confirmación de cita (se envía el día antes) · usa {"{nombre}"} y {"{fecha}"}</span>
        <textarea
          value={cfg.confirmMsg}
          onChange={(e) => setCfg({ ...cfg, confirmMsg: e.target.value })}
          rows={2}
          className="mt-1 w-full resize-y rounded-lg border border-line bg-navy px-3 py-2 text-[12px] text-bone outline-none focus:border-gold/50"
        />
      </label>

      <div className="mb-1 text-[11px] uppercase tracking-widest text-bone-dim">Controles post-tatuaje (días después de la sesión)</div>
      {cfg.steps.map((s, i) => (
        <div key={s.id} className="mb-2 rounded-lg border border-line/60 bg-navy-soft p-2">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] text-bone-dim">Día</span>
            <input
              type="number"
              min={0}
              value={s.dias}
              onChange={(e) => { const steps = [...cfg.steps]; steps[i] = { ...s, dias: Number(e.target.value) }; setCfg({ ...cfg, steps }); }}
              className="w-16 rounded-md border border-line bg-navy px-2 py-1 text-[12px] text-bone outline-none"
            />
            {RECOMENDADOS.includes(s.dias) && <span className="text-[10px] text-gold-soft">★ recomendado</span>}
            <button
              onClick={() => setCfg({ ...cfg, steps: cfg.steps.filter((x) => x.id !== s.id) })}
              className="ml-auto text-bone-dim hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          </div>
          <textarea
            value={s.msg}
            onChange={(e) => { const steps = [...cfg.steps]; steps[i] = { ...s, msg: e.target.value }; setCfg({ ...cfg, steps }); }}
            rows={2}
            className="w-full resize-y rounded-md border border-line bg-navy px-2 py-1 text-[12px] text-bone outline-none focus:border-gold/50"
          />
        </div>
      ))}
      <button
        onClick={() => setCfg({ ...cfg, steps: [...cfg.steps, { id: "s" + Date.now(), dias: 7, msg: "¿Cómo va tu Pieza? 🖤" }] })}
        className="mb-3 flex items-center gap-1 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] text-gold-soft hover:bg-gold/20"
      >
        <Plus size={12} /> Agregar control
      </button>

      <label className="mb-3 block">
        <span className="text-[11px] text-bone-dim">Link de reseñas de Google (a los que califican 4–5 se les envía solo)</span>
        <input
          value={cfg.reviewLink}
          onChange={(e) => setCfg({ ...cfg, reviewLink: e.target.value })}
          className="mt-1 w-full rounded-lg border border-line bg-navy px-3 py-2 text-[12px] text-bone outline-none focus:border-gold/50"
        />
      </label>

      <div className="flex items-center gap-2">
        <button onClick={save} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-soft disabled:opacity-50">
          <Save size={15} /> Guardar
        </button>
        {ok && <span className="text-[11px] text-[#3FB37F]">Guardado ✓</span>}
        <span className="ml-auto text-[9.5px] text-bone-dim/60">El sistema los envía a diario · leads &quot;agendado&quot; (confirmación) y &quot;cerrado&quot; (controles)</span>
      </div>
    </div>
  );
}
