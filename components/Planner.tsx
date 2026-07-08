"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Lightbulb, Palette, CalendarClock, Rocket, GripVertical, LayoutGrid, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type Campaign = { id: string; titulo: string; canal: string; fecha: string; nota: string; col: string };

const COLS = [
  { id: "ideas", label: "Ideas", Icon: Lightbulb, color: "#D8A24A", hint: "Todo lo que se te ocurra" },
  { id: "diseno", label: "En diseño", Icon: Palette, color: "#8E7CC3", hint: "Creando el contenido" },
  { id: "programada", label: "Programada", Icon: CalendarClock, color: "#5B8CB7", hint: "Con fecha lista" },
  { id: "publicada", label: "Publicada", Icon: Rocket, color: "#3FB37F", hint: "Ya está en el aire" },
];

const CANALES: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#E1306C" },
  facebook: { label: "Facebook", color: "#1877F2" },
  tiktok: { label: "TikTok", color: "#69C9D0" },
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  web: { label: "Web", color: "#37C7C0" },
  otro: { label: "Otro", color: "#C5A059" },
};

export default function Planner() {
  const [items, setItems] = useState<Campaign[] | null>(null);
  const [titulo, setTitulo] = useState("");
  const [canal, setCanal] = useState("instagram");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [vista, setVista] = useState<"tablero" | "calendario">("tablero");
  const [mes, setMes] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => {
    fetch("/api/planner").then((r) => (r.ok ? r.json() : { items: [] })).then((d) => setItems(d.items || [])).catch(() => setItems([]));
  }, []);

  async function post(body: unknown) {
    const r = await fetch("/api/planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { const d = await r.json(); setItems(d.items); }
  }

  function quickAdd() {
    if (!titulo.trim()) return;
    post({ action: "upsert", item: { titulo: titulo.trim(), canal, col: "ideas" } });
    setTitulo("");
  }

  function onDrop(col: string) {
    if (dragId) {
      // Optimista para que se sienta instantáneo
      setItems((prev) => prev && prev.map((x) => (x.id === dragId ? { ...x, col } : x)));
      post({ action: "move", id: dragId, col });
    }
    setDragId(null);
    setOverCol(null);
  }

  function dropEnDia(iso: string) {
    if (!dragId) return;
    const card = items?.find((x) => x.id === dragId);
    if (card) {
      setItems((prev) => prev && prev.map((x) => (x.id === dragId ? { ...x, fecha: iso } : x)));
      post({ action: "upsert", item: { ...card, fecha: iso } });
    }
    setDragId(null);
  }

  if (!items) return <div className="p-6 text-bone-dim">Cargando…</div>;

  // celdas del mes (con huecos iniciales para alinear el día de la semana)
  const primerDia = (mes.getDay() + 6) % 7; // lunes = 0
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celdas: (string | null)[] = [
    ...Array.from({ length: primerDia }, () => null),
    ...Array.from({ length: diasMes }, (_, i) => {
      const d = new Date(mes.getFullYear(), mes.getMonth(), i + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }),
  ];
  const hoyIso = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  const sinFecha = items.filter((x) => !x.fecha);

  return (
    <div className="flex h-full flex-col p-5">
      {/* Header + creación rápida */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="font-display text-lg text-bone">Planificador · Marketing</div>
            <div className="text-[11px] text-bone-dim">
              {vista === "tablero" ? "Escribe la idea, dale + y arrástrala entre columnas según avance." : "Arrastra las campañas a su día de publicación."}
            </div>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-line">
            <button onClick={() => setVista("tablero")} className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] ${vista === "tablero" ? "bg-gold/15 text-gold" : "text-bone-dim hover:text-bone"}`}>
              <LayoutGrid size={13} /> Tablero
            </button>
            <button onClick={() => setVista("calendario")} className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] ${vista === "calendario" ? "bg-gold/15 text-gold" : "text-bone-dim hover:text-bone"}`}>
              <CalendarDays size={13} /> Calendario
            </button>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && quickAdd()}
            placeholder="Nueva idea… (ej: Reel del cover-up de María)"
            className="w-full rounded-lg border border-line bg-navy-soft px-3 py-2 text-sm text-bone outline-none placeholder:text-bone-dim/60 focus:border-gold/50 sm:w-64"
          />
          <select value={canal} onChange={(e) => setCanal(e.target.value)} className="rounded-lg border border-line bg-navy-soft px-2 py-2 text-sm text-bone outline-none">
            {Object.entries(CANALES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={quickAdd} className="flex items-center gap-1 rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-navy hover:bg-gold-soft"><Plus size={16} /> Añadir</button>
        </div>
      </div>

      {/* Vista Calendario */}
      {vista === "calendario" && (
        <div className="flex flex-1 flex-col overflow-auto">
          <div className="mb-2 flex items-center gap-3">
            <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))} className="rounded-lg border border-line p-1.5 text-bone-dim hover:text-bone"><ChevronLeft size={15} /></button>
            <div className="font-display text-sm capitalize text-bone">{mes.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}</div>
            <button onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))} className="rounded-lg border border-line p-1.5 text-bone-dim hover:text-bone"><ChevronRight size={15} /></button>
          </div>

          {sinFecha.length > 0 && (
            <div className="glass mb-3 rounded-xl p-2">
              <div className="mb-1 text-[10px] uppercase tracking-widest text-bone-dim">Sin fecha · arrástralas a un día</div>
              <div className="flex flex-wrap gap-1.5">
                {sinFecha.map((c) => {
                  const cn = CANALES[c.canal] || CANALES.otro;
                  return (
                    <span
                      key={c.id}
                      draggable
                      onDragStart={() => setDragId(c.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`cursor-grab rounded-full border px-2 py-0.5 text-[11px] active:cursor-grabbing ${dragId === c.id ? "opacity-40" : ""}`}
                      style={{ borderColor: cn.color + "66", color: cn.color, background: cn.color + "14" }}
                    >
                      {c.titulo}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mb-1 grid grid-cols-7">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <div key={d} className="text-center text-[10px] uppercase tracking-widest text-bone-dim">{d}</div>
            ))}
          </div>
          <div className="glass grid flex-1 grid-cols-7 gap-px overflow-hidden rounded-xl p-1" style={{ gridAutoRows: "minmax(84px, 1fr)" }}>
            {celdas.map((iso, i) =>
              iso === null ? (
                <div key={"x" + i} />
              ) : (
                <div
                  key={iso}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropEnDia(iso)}
                  className={`flex flex-col gap-0.5 rounded-md border p-1 transition ${iso === hoyIso ? "border-gold/50 bg-gold/5" : "border-line/30 hover:border-line/70"}`}
                >
                  <span className={`text-[10px] ${iso === hoyIso ? "font-bold text-gold" : "text-bone-dim"}`}>{Number(iso.slice(8))}</span>
                  {items.filter((x) => x.fecha === iso).map((c) => {
                    const cn = CANALES[c.canal] || CANALES.otro;
                    return (
                      <span
                        key={c.id}
                        draggable
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => setDragId(null)}
                        title={c.titulo + (c.nota ? " — " + c.nota : "")}
                        className="cursor-grab truncate rounded px-1 py-0.5 text-[10px] leading-tight active:cursor-grabbing"
                        style={{ background: cn.color + "26", color: cn.color, borderLeft: `2px solid ${cn.color}` }}
                      >
                        {c.titulo}
                      </span>
                    );
                  })}
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Tablero */}
      <div className={`grid flex-1 grid-cols-1 gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-4 ${vista === "calendario" ? "hidden" : ""}`}>
        {COLS.map((c) => {
          const cards = items.filter((x) => x.col === c.id);
          return (
            <div
              key={c.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(c.id); }}
              onDragLeave={() => setOverCol((p) => (p === c.id ? null : p))}
              onDrop={() => onDrop(c.id)}
              className={`glass flex min-h-[300px] flex-col rounded-xl p-3 transition ${overCol === c.id ? "ring-2 ring-gold/60" : ""}`}
            >
              <div className="mb-1 flex items-center gap-2">
                <c.Icon size={16} style={{ color: c.color }} />
                <span className="text-sm font-semibold text-bone">{c.label}</span>
                <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: c.color + "22", color: c.color }}>{cards.length}</span>
              </div>
              <div className="mb-2 h-0.5 w-full rounded" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
              <div className="mb-2 text-[10px] text-bone-dim">{c.hint}</div>

              <div className="flex flex-1 flex-col gap-2">
                {cards.map((card) => {
                  const cn = CANALES[card.canal] || CANALES.otro;
                  const isOpen = open === card.id;
                  return (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={() => setDragId(card.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`group cursor-grab rounded-lg border border-line/60 bg-navy-soft p-2.5 transition hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing ${dragId === card.id ? "opacity-40" : ""}`}
                      style={{ borderLeft: `3px solid ${cn.color}` }}
                    >
                      <div className="flex items-start gap-1.5">
                        <GripVertical size={13} className="mt-0.5 shrink-0 text-bone-dim/40" />
                        <button onClick={() => setOpen(isOpen ? null : card.id)} className="min-w-0 flex-1 text-left text-[13px] font-medium leading-snug text-bone">
                          {card.titulo}
                        </button>
                        <button onClick={() => { if (confirm("¿Eliminar esta idea?")) post({ action: "delete", id: card.id }); }} className="text-bone-dim/50 opacity-0 transition hover:text-red-400 group-hover:opacity-100"><Trash2 size={13} /></button>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-5">
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide" style={{ background: cn.color + "22", color: cn.color }}>{cn.label}</span>
                        {card.fecha && <span className="text-[10px] text-bone-dim">📅 {card.fecha}</span>}
                        {card.nota && !isOpen && <span className="text-[10px] text-bone-dim/70">✎ nota</span>}
                      </div>
                      {isOpen && (
                        <div className="mt-2 space-y-1.5 pl-5">
                          <input
                            type="date"
                            defaultValue={card.fecha}
                            onBlur={(e) => post({ action: "upsert", item: { ...card, fecha: e.target.value } })}
                            className="w-full rounded-md border border-line bg-navy px-2 py-1 text-[11px] text-bone-dim outline-none"
                          />
                          <textarea
                            defaultValue={card.nota}
                            placeholder="Notas, copy, hashtags…"
                            rows={3}
                            onBlur={(e) => { if (e.target.value !== card.nota) post({ action: "upsert", item: { ...card, nota: e.target.value } }); }}
                            className="w-full resize-y rounded-md border border-line bg-navy px-2 py-1 text-[11px] text-bone outline-none placeholder:text-bone-dim/50"
                          />
                          <select
                            defaultValue={card.canal}
                            onChange={(e) => post({ action: "upsert", item: { ...card, canal: e.target.value } })}
                            className="rounded-md border border-line bg-navy px-2 py-1 text-[11px] text-bone-dim outline-none"
                          >
                            {Object.entries(CANALES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line/50 p-4 text-center text-[11px] text-bone-dim/50">
                    Arrastra aquí o crea una idea
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
