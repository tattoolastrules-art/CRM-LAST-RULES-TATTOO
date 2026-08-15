"use client";

// Asistente guiado para CREAR un flujo de conversación sin saber de sistemas.
// Acompaña paso a paso (tutorial) con consejos de la mejor forma de armarlo,
// y al final Ana responde ese flujo automáticamente (sin gastar IA).

import { useEffect, useRef, useState } from "react";
import { X, ArrowLeft, ArrowRight, Lightbulb, MessageSquare, Zap, GitBranch, Flag, Eye, Check, Trash2 } from "lucide-react";
import type { CustomFlow, CustomFlowOption } from "@/lib/custom-flows-def";

interface Props {
  initial?: CustomFlow | null;
  onClose: () => void;
  onSaved: (custom: CustomFlow[]) => void;
}

const CHANNELS = [
  { id: "all", label: "Todos los canales" },
  { id: "whatsapp", label: "Solo WhatsApp" },
  { id: "instagram", label: "Solo Instagram" },
  { id: "facebook", label: "Solo Messenger" },
] as const;

// Consejo con la bombilla dorada (el "acompañamiento" del asistente)
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gold/25 bg-gold/8 px-3 py-2 text-[12px] leading-relaxed text-gold-soft">
      <Lightbulb size={14} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

const PASOS = [
  { icon: Lightbulb, title: "Cómo funciona" },
  { icon: Flag, title: "Objetivo" },
  { icon: Zap, title: "Disparador" },
  { icon: MessageSquare, title: "Primer mensaje" },
  { icon: GitBranch, title: "Opciones" },
  { icon: Flag, title: "Cierre" },
  { icon: Eye, title: "Revisar y guardar" },
];

export default function FlowWizard({ initial, onClose, onSaved }: Props) {
  const [paso, setPaso] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState(initial?.name || "");
  const [goal, setGoal] = useState(initial?.goal || "");
  const [channel, setChannel] = useState<CustomFlow["channel"]>(initial?.channel || "all");
  const [keywords, setKeywords] = useState<string[]>(initial?.keywords || []);
  const [kwDraft, setKwDraft] = useState("");
  const [welcome, setWelcome] = useState(initial?.welcome || "");
  const [options, setOptions] = useState<CustomFlowOption[]>(initial?.options || []);
  const [closing, setClosing] = useState(initial?.closing || "");

  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { dialogRef.current?.focus(); }, []);

  function addKeyword() {
    const k = kwDraft.trim().toLowerCase();
    if (!k || keywords.includes(k) || keywords.length >= 10) return;
    if (k.length < 3) {
      setError("Usa palabras de al menos 3 letras: las muy cortas dispararían el flujo con cualquier mensaje.");
      return;
    }
    setError("");
    setKeywords([...keywords, k]);
    setKwDraft("");
  }

  function valida(p: number): string {
    if (p === 1 && !name.trim()) return "Ponle un nombre al flujo para continuar.";
    if (p === 2 && keywords.length === 0) return "Agrega al menos una palabra que dispare el flujo.";
    if (p === 3 && !welcome.trim()) return "Escribe el primer mensaje que Ana enviará.";
    if (p === 4 && options.some((o) => (o.label.trim() && !o.reply.trim()) || (!o.label.trim() && o.reply.trim())))
      return "Cada opción necesita su texto y su respuesta (o bórrala).";
    return "";
  }

  function siguiente() {
    const e = valida(paso);
    if (e) { setError(e); return; }
    setError("");
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  }

  async function guardar() {
    setSaving(true);
    setError("");
    try {
      const flow: Partial<CustomFlow> = {
        id: initial?.id,
        name, goal, channel, keywords,
        welcome,
        options: options.filter((o) => o.label.trim() && o.reply.trim()),
        closing,
        active: initial?.active ?? true,
        createdAt: initial?.createdAt,
      };
      const r = await fetch("/api/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "custom-save", flow }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "Solo administradores pueden crear flujos."); return; }
      onSaved(d.custom || []);
      onClose();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const Icon = PASOS[paso].icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={initial ? "Editar flujo" : "Crear flujo"}
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="glass flex h-[94dvh] w-full flex-col rounded-t-2xl sm:h-auto sm:max-h-[88vh] sm:max-w-2xl sm:rounded-2xl">
        {/* Encabezado con progreso */}
        <div className="flex items-center gap-3 border-b border-line/60 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold">
            <Icon size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm text-bone">
              {initial ? "Editar flujo" : "Crear flujo"} · {PASOS[paso].title}
            </div>
            <div className="mt-1 flex gap-1">
              {PASOS.map((_, i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i <= paso ? "bg-gold" : "bg-line"}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-bone-dim hover:text-bone" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Contenido del paso */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {paso === 0 && (
            <>
              <p className="text-sm leading-relaxed text-bone">
                Un <b className="text-gold-soft">flujo</b> es una conversación armada de antemano: cuando un cliente
                escribe ciertas palabras, Ana responde sola con los mensajes que tú definas — al instante y sin gastar IA.
              </p>
              <div className="space-y-2">
                {[
                  ["⚡ Disparador", "Las palabras que encienden el flujo (ej: “domicilio”, “piercing”)."],
                  ["💬 Primer mensaje", "Lo primero que Ana responde cuando se dispara."],
                  ["🔀 Opciones", "Caminos que le ofreces al cliente (hasta 4), cada uno con su respuesta."],
                  ["🏁 Cierre", "El empujón final: invitar a agendar, cotizar o dejar el dato."],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-lg border border-line/60 bg-navy-soft/60 px-3 py-2">
                    <div className="text-[12px] font-semibold text-bone">{t}</div>
                    <div className="text-[11.5px] text-bone-dim">{d}</div>
                  </div>
                ))}
              </div>
              <Tip>
                La mejor forma: <b>un flujo = un objetivo</b>. Mensajes cortos, una sola pregunta a la vez, y cerrar
                SIEMPRE con un siguiente paso (agendar, cotizar, asesoría). Yo te acompaño en cada paso 🖤
              </Tip>
            </>
          )}

          {paso === 1 && (
            <>
              <label className="block">
                <span className="text-[11px] text-bone-dim">Nombre del flujo</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Tatuajes en pareja"
                  className="mt-1 w-full rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
                />
              </label>
              <label className="block">
                <span className="text-[11px] text-bone-dim">¿Qué debe lograr? (el objetivo)</span>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Ej: que las parejas agenden su sesión doble"
                  className="mt-1 w-full rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
                />
              </label>
              <div>
                <span className="text-[11px] text-bone-dim">¿En qué canal aplica?</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {CHANNELS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setChannel(c.id)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${channel === c.id ? "border-gold/60 bg-gold/15 text-gold" : "border-line text-bone-dim hover:text-bone"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <Tip>
                Escribe el objetivo en una frase con verbo: <i>“que el cliente agende…”, “que deje su idea…”</i>. Si el
                objetivo necesita dos flujos distintos, mejor crea dos.
              </Tip>
            </>
          )}

          {paso === 2 && (
            <>
              <p className="text-sm text-bone">
                ¿Con qué <b className="text-gold-soft">palabras</b> del cliente se enciende este flujo?
              </p>
              <div className="flex gap-2">
                <input
                  value={kwDraft}
                  onChange={(e) => setKwDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addKeyword(); }}
                  placeholder="Escribe una palabra y Enter (ej: pareja)"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
                />
                <button onClick={addKeyword} className="shrink-0 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-navy hover:bg-gold-soft">
                  Agregar
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((k) => (
                  <span key={k} className="flex items-center gap-1 rounded-full border border-gold/30 bg-navy-soft px-2.5 py-1 text-xs text-gold-soft">
                    {k}
                    <button onClick={() => setKeywords(keywords.filter((x) => x !== k))} className="text-bone-dim hover:text-bone" aria-label={"Quitar " + k}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
                {keywords.length === 0 && <span className="text-[11px] text-bone-dim">Aún no hay palabras.</span>}
              </div>
              <Tip>
                Piensa en cómo escribe la gente de verdad: en minúscula, con errores y a medias (mejor “parej” que
                “tatuajes en pareja”). Agrega 3–5 variantes; evita palabras demasiado comunes como “hola” o “tatuaje”,
                que dispararían este flujo todo el tiempo.
              </Tip>
            </>
          )}

          {paso === 3 && (
            <>
              <p className="text-sm text-bone">
                Lo primero que Ana responde cuando el flujo se enciende:
              </p>
              <textarea
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
                rows={4}
                placeholder="Ej: ¡Qué buena idea un tatuaje en pareja! 🖤 ¿Ya tienen el diseño pensado o quieren que los asesoremos?"
                className="w-full resize-y rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
              />
              <div className="text-right text-[10px] text-bone-dim">{welcome.length}/600</div>
              <Tip>
                Corto y humano: máximo ~40 palabras, <b>una sola pregunta</b>, y reacciona a lo que dijo el cliente antes
                de preguntar. Emojis de la marca: 🖤 🤍 ✨ 👑 (sin verdes ni rojos). Nunca prometas precios.
              </Tip>
            </>
          )}

          {paso === 4 && (
            <>
              <p className="text-sm text-bone">
                Opciones que le ofreces al cliente (hasta 4). Cada una con su respuesta. Puedes dejarlo sin opciones.
              </p>
              {options.map((o, i) => (
                <div key={i} className="rounded-lg border border-line/60 bg-navy-soft/60 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gold-soft">Opción {i + 1}</span>
                    <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-bone-dim hover:text-red-400" aria-label="Eliminar opción">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <input
                    value={o.label}
                    onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    placeholder="Lo que elige el cliente (ej: Ya tenemos diseño)"
                    className="mb-1.5 w-full rounded-lg border border-line bg-navy px-3 py-1.5 text-sm text-bone outline-none focus:border-gold/50"
                  />
                  <textarea
                    value={o.reply}
                    onChange={(e) => setOptions(options.map((x, j) => (j === i ? { ...x, reply: e.target.value } : x)))}
                    rows={2}
                    placeholder="Lo que Ana responde a esa opción"
                    className="w-full resize-y rounded-lg border border-line bg-navy px-3 py-1.5 text-sm text-bone outline-none focus:border-gold/50"
                  />
                </div>
              ))}
              {options.length < 4 && (
                <button
                  onClick={() => setOptions([...options, { label: "", reply: "" }])}
                  className="w-full rounded-lg border border-dashed border-gold/40 bg-gold/5 px-3 py-2 text-sm text-gold-soft hover:bg-gold/10"
                >
                  + Agregar opción
                </button>
              )}
              <Tip>
                Ana enviará las opciones numeradas (1, 2, 3…) y entenderá si el cliente responde con el número o con el
                texto. Opciones cortas y distintas entre sí funcionan mejor.
              </Tip>
            </>
          )}

          {paso === 5 && (
            <>
              <p className="text-sm text-bone">
                El cierre: el mensaje que empuja al siguiente paso después de cualquier opción.
              </p>
              <textarea
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                rows={3}
                placeholder="Ej: ¿Te parece si agendamos su asesoría gratis para verlo en persona? 🖤 ¿Entre semana o fin de semana?"
                className="w-full resize-y rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  "¿Agendamos tu asesoría gratis? 🖤 ¿Entre semana o fin de semana?",
                  "Para apartar tu cupo va un abono de $100.000 que se descuenta del total ✨ ¿Lo agendamos?",
                  "Cuéntame tu idea y un tatuador te la cotiza a la medida 👑",
                ].map((s) => (
                  <button key={s} onClick={() => setClosing(s)} className="rounded-lg border border-line bg-navy-soft px-2.5 py-1.5 text-left text-[11px] text-bone-dim transition hover:border-gold/40 hover:text-bone">
                    {s}
                  </button>
                ))}
              </div>
              <Tip>
                Todo flujo debe terminar en acción: agendar, cotizar o asesoría. Termina con una pregunta fácil de
                responder (mejor “¿entre semana o fin de semana?” que “¿cuándo puedes?”).
              </Tip>
            </>
          )}

          {paso === 6 && (
            <>
              <p className="text-sm text-bone">Así se verá la conversación:</p>
              <div className="space-y-1.5 rounded-xl bg-[#0b141a] p-3">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg rounded-tl-none bg-[#202c33] px-2.5 py-1.5 text-sm text-[#e9edef]">
                    {keywords[0] || "…"}
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[85%] whitespace-pre-line rounded-lg rounded-tr-none bg-[#005c4b] px-2.5 py-1.5 text-sm text-[#e9edef]">
                    {welcome}
                    {options.length > 0 && "\n\n" + options.map((o, i) => `${i + 1}. ${o.label}`).join("\n")}
                  </div>
                </div>
                {options[0]?.label && (
                  <>
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg rounded-tl-none bg-[#202c33] px-2.5 py-1.5 text-sm text-[#e9edef]">1</div>
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-line rounded-lg rounded-tr-none bg-[#005c4b] px-2.5 py-1.5 text-sm text-[#e9edef]">
                        {options[0].reply}
                        {closing && "\n\n" + closing}
                      </div>
                    </div>
                  </>
                )}
                {!options.length && closing && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg rounded-tr-none bg-[#005c4b] px-2.5 py-1.5 text-sm text-[#e9edef]">{closing}</div>
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-line/60 bg-navy-soft/60 px-3 py-2 text-[11.5px] text-bone-dim">
                <b className="text-bone">{name || "Flujo sin nombre"}</b> · se dispara con: {keywords.join(", ") || "—"} ·{" "}
                {CHANNELS.find((c) => c.id === channel)?.label}
              </div>
              <Tip>
                Al guardar, Ana empieza a responder este flujo de una vez (sin gastar IA). Podrás editarlo o borrarlo
                cuando quieras desde la lista de flujos.
              </Tip>
            </>
          )}

          {error && <div className="rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-[12px] text-red-300">{error}</div>}
        </div>

        {/* Navegación */}
        <div className="flex items-center justify-between gap-2 border-t border-line/60 px-4 py-3">
          <button
            onClick={() => { setError(""); setPaso((p) => Math.max(0, p - 1)); }}
            disabled={paso === 0}
            className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-sm text-bone-dim transition hover:text-bone disabled:opacity-40"
          >
            <ArrowLeft size={14} /> Atrás
          </button>
          <span className="text-[10px] text-bone-dim">Paso {paso + 1} de {PASOS.length}</span>
          {paso < PASOS.length - 1 ? (
            <button onClick={siguiente} className="flex items-center gap-1 rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-navy hover:bg-gold-soft">
              Siguiente <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={guardar} disabled={saving} className="flex items-center gap-1 rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-navy hover:bg-gold-soft disabled:opacity-50">
              <Check size={14} /> {saving ? "Guardando…" : "Guardar flujo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
