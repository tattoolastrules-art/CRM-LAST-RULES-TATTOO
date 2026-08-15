"use client";

// Plantillas de bienvenida por canal: las preguntas listas que ve el cliente al
// abrir el chat (Instagram / Messenger / WhatsApp), con su respuesta automática.
// Instagram y Messenger se publican en Meta; WhatsApp envía botones en la
// bienvenida a contactos nuevos.

import { useEffect, useRef, useState } from "react";
import { X, Plus, Trash2, Save, Send, Camera, ThumbsUp, MessageCircleMore } from "lucide-react";
import type { IceBreakersConfig, IceBreaker } from "@/lib/ice-breakers-def";

type Canal = "instagram" | "facebook" | "whatsapp";

const CANALES: { id: Canal; label: string; Icon: typeof Camera; color: string; max: number; qMax: number }[] = [
  { id: "instagram", label: "Instagram", Icon: Camera, color: "#E1306C", max: 4, qMax: 80 },
  { id: "facebook", label: "Messenger", Icon: ThumbsUp, color: "#1877F2", max: 4, qMax: 80 },
  { id: "whatsapp", label: "WhatsApp", Icon: MessageCircleMore, color: "#25D366", max: 3, qMax: 20 },
];

export default function IceBreakersPanel({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<IceBreakersConfig | null>(null);
  const [metaReady, setMetaReady] = useState(false);
  const [canal, setCanal] = useState<Canal>("instagram");
  const [busy, setBusy] = useState<"" | "save" | "publish">("");
  const [msg, setMsg] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => { dialogRef.current?.focus(); }, []);

  useEffect(() => {
    fetch("/api/icebreakers")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.config) setCfg(d.config);
        setMetaReady(!!d?.metaReady);
      })
      .catch(() => {});
  }, []);

  const info = CANALES.find((c) => c.id === canal)!;
  const items: IceBreaker[] = cfg ? cfg[canal] : [];

  function setItems(next: IceBreaker[]) {
    if (cfg) setCfg({ ...cfg, [canal]: next });
  }

  async function guardar(publish: boolean) {
    if (!cfg) return;
    setBusy(publish ? "publish" : "save");
    setMsg("");
    try {
      const r = await fetch("/api/icebreakers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg, ...(publish ? { action: "publish" } : {}) }),
      });
      const d = await r.json();
      if (!r.ok) setMsg(d.error || "Solo administradores pueden editar.");
      else if (publish) setMsg(d.published ? "Publicado en Instagram y Messenger ✓" : d.error || "No se pudo publicar en Meta.");
      else setMsg("Guardado ✓ (WhatsApp aplica de una; IG/Messenger necesitan “Publicar en Meta”)");
      if (d.config) setCfg(d.config);
    } catch {
      setMsg("Error de conexión.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Plantillas de bienvenida"
      ref={dialogRef}
      tabIndex={-1}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div className="glass flex h-[94dvh] w-full flex-col rounded-t-2xl sm:h-auto sm:max-h-[88vh] sm:max-w-3xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-line/60 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm text-bone">Plantillas de bienvenida</div>
            <div className="text-[11px] text-bone-dim">
              Las preguntas listas que ve el cliente al abrir el chat, con la respuesta automática de Ana (sin gastar IA).
            </div>
          </div>
          <button onClick={onClose} className="text-bone-dim hover:text-bone" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {!cfg ? (
          <div className="p-8 text-center text-sm text-bone-dim">Cargando…</div>
        ) : (
          <>
            <div className="flex gap-2 border-b border-line/60 px-4 py-2.5">
              {CANALES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCanal(c.id); setMsg(""); }}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition ${canal === c.id ? "border-gold/60 bg-gold/15 text-gold" : "border-line text-bone-dim hover:text-bone"}`}
                >
                  <c.Icon size={13} style={{ color: c.color }} /> {c.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {canal === "whatsapp" && (
                <>
                  <div className="rounded-lg border border-line/60 bg-navy-soft/60 px-3 py-2 text-[11.5px] leading-relaxed text-bone-dim">
                    En WhatsApp no existen las preguntas de Instagram; el equivalente son <b className="text-bone">botones</b> (máximo
                    3, títulos de hasta 20 caracteres — los emojis pueden contar doble) que Ana envía con la bienvenida
                    cuando un contacto NUEVO saluda.
                  </div>
                  <label className="block">
                    <span className="text-[11px] text-bone-dim">Mensaje de bienvenida (acompaña los botones)</span>
                    <textarea
                      value={cfg.waWelcome}
                      onChange={(e) => setCfg({ ...cfg, waWelcome: e.target.value })}
                      rows={2}
                      className="mt-1 w-full resize-y rounded-lg border border-line bg-navy px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
                    />
                  </label>
                </>
              )}
              {canal !== "whatsapp" && (
                <div className="rounded-lg border border-line/60 bg-navy-soft/60 px-3 py-2 text-[11.5px] leading-relaxed text-bone-dim">
                  Aparecen como burbujas al abrir un chat nuevo con la cuenta (máximo {info.max}). Cuando el cliente toca
                  una, Ana responde al instante con el texto que definas aquí. Al terminar dale{" "}
                  <b className="text-bone">Publicar en Meta</b>.
                </div>
              )}

              {items.map((it, i) => (
                <div key={i} className="rounded-lg border border-line/60 bg-navy-soft/60 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-gold-soft">
                      {canal === "whatsapp" ? `Botón ${i + 1}` : `Pregunta ${i + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-bone-dim">{it.q.length}/{info.qMax}</span>
                      <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-bone-dim hover:text-red-400" aria-label="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <input
                    value={it.q}
                    maxLength={info.qMax}
                    onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                    placeholder={canal === "whatsapp" ? "Título corto del botón" : "La pregunta que ve el cliente"}
                    className="mb-1.5 w-full rounded-lg border border-line bg-navy px-3 py-1.5 text-sm text-bone outline-none focus:border-gold/50"
                  />
                  <textarea
                    value={it.a}
                    onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                    rows={2}
                    placeholder="La respuesta automática de Ana"
                    className="w-full resize-y rounded-lg border border-line bg-navy px-3 py-1.5 text-sm text-bone outline-none focus:border-gold/50"
                  />
                </div>
              ))}
              {items.length < info.max && (
                <button
                  onClick={() => setItems([...items, { q: "", a: "" }])}
                  className="w-full rounded-lg border border-dashed border-gold/40 bg-gold/5 px-3 py-2 text-sm text-gold-soft hover:bg-gold/10"
                >
                  <Plus size={14} className="mr-1 inline" /> Agregar {canal === "whatsapp" ? "botón" : "pregunta"}
                </button>
              )}

              {/* Vista previa (como la ve el cliente) */}
              <div>
                <div className="mb-1 text-[11px] text-bone-dim">Así lo ve el cliente:</div>
                <div className="rounded-xl bg-[#0b141a] p-3">
                  {canal === "whatsapp" ? (
                    <div className="max-w-[85%] space-y-1">
                      <div className="rounded-lg rounded-tl-none bg-[#202c33] px-2.5 py-1.5 text-sm text-[#e9edef]">{cfg.waWelcome}</div>
                      {items.filter((x) => x.q).map((x, i) => (
                        <div key={i} className="rounded-lg bg-[#202c33] px-2.5 py-1.5 text-center text-sm text-[#53bdeb]">{x.q}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-center text-[11px] text-[#8696a0]">Toca para enviar</div>
                      {items.filter((x) => x.q).map((x, i) => (
                        <div key={i} className="ml-auto w-fit max-w-[90%] rounded-2xl bg-[#202c33] px-3.5 py-2 text-right text-sm text-[#6a7bf7]">
                          {x.q}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-[11px] text-gold-soft">{msg}</span>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => guardar(false)}
                  disabled={!!busy}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-bone transition hover:border-gold/50 disabled:opacity-50"
                >
                  <Save size={14} /> {busy === "save" ? "Guardando…" : "Guardar"}
                </button>
                <button
                  onClick={() => guardar(true)}
                  disabled={!!busy || !metaReady}
                  title={metaReady ? "Guardar y publicar las preguntas en Instagram y Messenger" : "Falta FB_PAGE_TOKEN en el entorno"}
                  className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-sm font-semibold text-navy hover:bg-gold-soft disabled:opacity-50"
                >
                  <Send size={14} /> {busy === "publish" ? "Publicando…" : "Publicar en Meta"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
