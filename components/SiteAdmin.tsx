"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Upload, Eye, EyeOff, ImagePlus, Brain } from "lucide-react";

type Coleccion = "tatuadores" | "publicaciones" | "noticias" | "premios";
type Item = Record<string, unknown>;

const TABS: { id: Coleccion | "info"; label: string }[] = [
  { id: "tatuadores", label: "Tatuadores" },
  { id: "publicaciones", label: "Publicaciones" },
  { id: "noticias", label: "Noticias" },
  { id: "premios", label: "Premios" },
  { id: "info", label: "Info del sitio" },
];

type Field = [key: string, label: string, type?: "area" | "bool" | "date"];

const FIELDS: Record<Coleccion, Field[]> = {
  tatuadores: [["nombre", "Nombre"], ["estilos", "Estilos (separa con coma)"], ["bio", "Bio", "area"], ["fotoUrl", "Foto (URL)"], ["instagram", "Instagram"], ["activo", "Visible en la web", "bool"]],
  publicaciones: [["titulo", "Título"], ["descripcion", "Descripción", "area"], ["tatuador", "Tatuador"], ["imagenUrl", "Imagen (URL)"], ["fecha", "Fecha", "date"], ["destacado", "Destacada", "bool"]],
  noticias: [["titulo", "Título"], ["cuerpo", "Texto", "area"], ["imagenUrl", "Imagen (URL)"], ["fecha", "Fecha", "date"], ["publicada", "Publicada", "bool"]],
  premios: [["titulo", "Título / Galardón"], ["evento", "Evento / Lugar"], ["anio", "Año"], ["imagenUrl", "Foto (URL)"], ["activo", "Visible en la web", "bool"]],
};

const INFO_FIELDS: Field[] = [["nombre", "Nombre"], ["lema", "Lema"], ["ciudad", "Ciudad"], ["direccion", "Dirección"], ["horario", "Horario"], ["whatsapp", "WhatsApp"], ["instagram", "Instagram"], ["portada", "Portada (URL imagen)"]];

// Redimensiona la imagen en el navegador antes de subir (evita fotos de 100 MB).
async function resizeImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        const r = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * r);
        h = Math.round(h * r);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/jpeg", quality);
    };
    img.onerror = () => reject(new Error("img error"));
    img.src = URL.createObjectURL(file);
  });
}

export default function SiteAdmin() {
  const [content, setContent] = useState<Record<string, Item[] | Item> | null>(null);
  const [info, setInfo] = useState<Item>({});
  const [tab, setTab] = useState<Coleccion | "info">("tatuadores");
  const [editing, setEditing] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [pub, setPub] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [training, setTraining] = useState(false);

  async function publish() {
    setPub("Publicando…");
    try {
      const r = await fetch("/api/publish", { method: "POST" });
      const d = await r.json();
      setPub(r.ok ? "Publicado en el sitio ✓" : d.error || "Error al publicar");
    } catch {
      setPub("Error de conexión");
    }
  }

  async function load() {
    try {
      const r = await fetch("/api/content");
      if (!r.ok) return; // conserva el estado anterior (una respuesta de error no es contenido)
      const c = await r.json();
      setContent(c);
      setInfo(c.info);
    } catch { /* sin conexión: se reintenta en la próxima acción */ }
  }
  useEffect(() => { load(); }, []);

  async function post(body: unknown): Promise<boolean> {
    setBusy(true);
    try {
      const r = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const c = await r.json();
      if (!r.ok) {
        alert(c.error || "No se pudo guardar");
        return false;
      }
      setContent(c);
      setInfo(c.info);
      return true;
    } catch {
      alert("Error de conexión");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startNew() {
    const blank: Item = {};
    FIELDS[tab as Coleccion].forEach(([k, , t]) => (blank[k] = t === "bool" ? true : ""));
    setEditing(blank);
  }
  function startEdit(it: Item) {
    const copy: Item = { ...it };
    if (Array.isArray(copy.estilos)) copy.estilos = (copy.estilos as string[]).join(", ");
    setEditing(copy);
  }
  async function save() {
    if (!editing) return;
    const item: Item = { ...editing };
    if (tab === "tatuadores") item.estilos = String(item.estilos || "").split(",").map((s) => s.trim()).filter(Boolean);
    await post({ action: "upsert", type: tab, item });
    setEditing(null);
  }

  const FLAGFIELD: Record<Coleccion, string> = { tatuadores: "activo", publicaciones: "destacado", noticias: "publicada", premios: "activo" };
  async function quickToggle(it: Item) {
    if (tab === "info") return;
    const f = FLAGFIELD[tab as Coleccion];
    await post({ action: "upsert", type: tab, item: { ...it, [f]: !it[f] } });
  }

  const IMGFIELD: Record<Coleccion, string> = { tatuadores: "fotoUrl", publicaciones: "imagenUrl", noticias: "imagenUrl", premios: "imagenUrl" };
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || tab === "info" || !editing) return;
    setUploading(true);
    try {
      const blob = await resizeImage(file);
      const fd = new FormData();
      fd.append("file", blob, (file.name.replace(/\.[^.]+$/, "") || "foto") + ".jpg");
      fd.append("type", tab);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok && d.path) setEditing((prev) => (prev ? { ...prev, [IMGFIELD[tab as Coleccion]]: d.path } : prev));
      else alert(d.error || "Error subiendo la foto");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  // Galería del tatuador: fotos de sus trabajos con las que la IA aprende su estilo
  async function handleGaleriaFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length || !editing) return;
    setUploading(true);
    try {
      const nuevas: string[] = [];
      for (const file of files.slice(0, 6)) {
        const blob = await resizeImage(file);
        const fd = new FormData();
        fd.append("file", blob, (file.name.replace(/\.[^.]+$/, "") || "obra") + ".jpg");
        fd.append("type", "tatuadores");
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (r.ok && d.path) nuevas.push(d.path);
        else alert(d.error || "Error subiendo una foto");
      }
      if (nuevas.length) {
        setEditing((prev) => {
          if (!prev) return prev;
          const galeria = [...((prev.galeria as string[]) || []), ...nuevas].slice(0, 12);
          return { ...prev, galeria };
        });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function entrenarIA() {
    if (!editing?.id || training) return;
    setTraining(true);
    try {
      // guarda primero (para que la galería recién subida quede en el tatuador)
      const item: Item = { ...editing };
      item.estilos = String(item.estilos || "").split(",").map((s) => s.trim()).filter(Boolean);
      if (!(await post({ action: "upsert", type: "tatuadores", item }))) return;
      const r = await fetch("/api/tatuadores/entrenar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing.id }),
      });
      const d = await r.json();
      if (!r.ok) alert(d.error || "No se pudo entrenar a la IA");
      else {
        setEditing((prev) => (prev ? { ...prev, estiloIA: d.estiloIA } : prev));
        if (d.content) { setContent(d.content); setInfo(d.content.info); }
        alert(`🧠 Listo: la IA aprendió el estilo con ${d.fotosAnalizadas} fotos. Ana ya lo usa en los chats.`);
      }
    } catch {
      alert("Error de conexión al entrenar");
    } finally {
      setTraining(false);
    }
  }

  async function handlePortadaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await resizeImage(file, 1920, 0.8);
      const fd = new FormData();
      fd.append("file", blob, "portada.jpg");
      fd.append("type", "info");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok && d.path) setInfo((p) => ({ ...p, portada: d.path }));
      else alert(d.error || "Error subiendo la portada");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (!content) return <div className="p-6 text-bone-dim">Cargando…</div>;

  const list = (tab === "info" ? [] : (content[tab] as Item[])) ?? [];
  const titleOf = (it: Item) => (it.nombre || it.titulo || "—") as string;
  const subOf = (it: Item) =>
    tab === "tatuadores" ? (it.estilos as string[])?.join(", ")
      : tab === "publicaciones" ? `${it.tatuador} · ${it.fecha}`
      : tab === "premios" ? [it.evento, it.anio].filter(Boolean).join(" · ")
      : (it.fecha as string);
  const flag = (it: Item) => (tab === "info" ? false : !!it[FLAGFIELD[tab as Coleccion]]);
  const flagLabel =
    tab === "tatuadores" || tab === "premios" ? "Visible" : tab === "publicaciones" ? "Destacada" : "Publicada";

  return (
    <div className="flex h-full flex-col p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-lg text-bone">Sitio web · Contenido</div>
          <div className="text-[11px] text-bone-dim">Edita aquí y dale Publicar para actualizar la web. <a href="https://lastrulestattoo.com" target="_blank" className="text-gold-soft hover:underline">Ver sitio →</a></div>
        </div>
        <div className="flex items-center gap-2">
          {pub && <span className="text-[11px] text-gold-soft">{pub}</span>}
          <button onClick={publish} className="flex items-center gap-1.5 rounded-lg border border-[#3FB37F]/40 bg-[#3FB37F]/10 px-3 py-1.5 text-sm text-[#3FB37F] hover:bg-[#3FB37F]/20">
            <Upload size={15} /> Publicar al sitio
          </button>
          {tab !== "info" && (
            <button onClick={startNew} className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1.5 text-sm text-gold-soft hover:bg-gold/20">
              <Plus size={15} /> Nuevo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setEditing(null); }}
            className={`rounded-full border px-3 py-1 text-xs transition ${tab === t.id ? "border-gold/60 bg-gold/15 text-gold" : "border-line text-bone-dim hover:text-bone"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-[1fr_360px]">
        {/* Lista */}
        <div className="glass overflow-auto rounded-xl p-3">
          {tab === "tatuadores" && (() => {
            const sinFotos = list.filter((t) => ((t.galeria as string[]) || []).length < 2);
            const sinIA = list.filter((t) => ((t.galeria as string[]) || []).length >= 2 && !t.estiloIA);
            if (!sinFotos.length && !sinIA.length) return null;
            return (
              <div className="mb-3 flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/8 px-3 py-2 text-[11.5px] leading-relaxed text-gold-soft">
                <Brain size={14} className="mt-0.5 shrink-0" />
                <span>
                  La IA aprende el estilo de cada tatuador con sus fotos: pídele a <b>Alejandro</b> subir 3–6 trabajos
                  por artista y dale “Entrenar IA”. Así Ana reconoce estilos y recomienda al artista ideal en los chats.
                  {sinFotos.length > 0 && (
                    <> · <b>Faltan fotos:</b> {sinFotos.map((t) => t.alias || t.nombre).join(", ")}</>
                  )}
                  {sinIA.length > 0 && (
                    <> · <b>Falta entrenar:</b> {sinIA.map((t) => t.alias || t.nombre).join(", ")}</>
                  )}
                </span>
              </div>
            );
          })()}
          {tab === "info" ? (
            <div className="space-y-3">
              {INFO_FIELDS.map(([k, label]) => (
                <label key={k} className="block">
                  <span className="text-[11px] text-bone-dim">{label}</span>
                  <input
                    value={(info[k] as string) || ""}
                    onChange={(e) => setInfo({ ...info, [k]: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line bg-navy-soft px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
                  />
                </label>
              ))}
              <div>
                <span className="text-[11px] text-bone-dim">Imagen de portada (se optimiza al subir)</span>
                <label className="mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-gold/40 bg-gold/5 px-3 py-2 text-sm text-gold-soft hover:bg-gold/10">
                  <ImagePlus size={15} /> {uploading ? "Subiendo…" : "Subir portada"}
                  <input type="file" accept="image/*" onChange={handlePortadaFile} className="hidden" />
                </label>
                {info.portada ? <div className="mt-1 truncate text-[10px] text-bone-dim">📎 {String(info.portada)}</div> : null}
              </div>
              <button onClick={() => post({ action: "info", info })} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-soft">
                <Save size={15} /> Guardar info
              </button>
            </div>
          ) : list.length === 0 ? (
            <p className="p-4 text-sm text-bone-dim">Sin elementos. Crea el primero con “Nuevo”.</p>
          ) : (
            <div className="space-y-2">
              {list.map((it) => (
                <div key={it.id as string} className="flex items-center gap-3 rounded-lg border border-line/60 bg-navy-soft px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate text-sm font-medium text-bone">
                      <span className="truncate">{titleOf(it)}</span>
                      {tab === "tatuadores" && !!it.estiloIA && (
                        <span title="La IA ya aprendió su estilo" className="shrink-0 rounded bg-[#37C7C0]/15 px-1 py-0.5 text-[9px] font-bold text-[#37C7C0]">🧠 IA</span>
                      )}
                    </div>
                    <div className="truncate text-[11px] text-bone-dim">{subOf(it)}</div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${flag(it) ? "bg-[#3FB37F]/15 text-[#3FB37F]" : "bg-line/40 text-bone-dim"}`}>
                    {flag(it) ? flagLabel : "Oculto"}
                  </span>
                  <button onClick={() => quickToggle(it)} title={flag(it) ? "Ocultar" : "Publicar"} className="text-bone-dim hover:text-bone">{flag(it) ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                  <button onClick={() => startEdit(it)} className="text-bone-dim hover:text-gold-soft"><Pencil size={15} /></button>
                  <button onClick={() => { if (confirm("¿Eliminar definitivamente?")) post({ action: "delete", type: tab, id: it.id }); }} className="text-bone-dim hover:text-red-400"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Editor */}
        {editing && tab !== "info" && (
          <div className="glass overflow-auto rounded-xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-sm text-bone">{editing.id ? "Editar" : "Nuevo"}</span>
              <button onClick={() => setEditing(null)} className="text-bone-dim hover:text-bone"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-bone-dim">Foto (se optimiza sola al subir)</span>
                <label className="mt-1 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-gold/40 bg-gold/5 px-3 py-2 text-sm text-gold-soft hover:bg-gold/10">
                  <ImagePlus size={15} /> {uploading ? "Subiendo…" : "Subir foto"}
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
                {editing[IMGFIELD[tab as Coleccion]] ? (
                  <div className="mt-1 truncate text-[10px] text-bone-dim">📎 {String(editing[IMGFIELD[tab as Coleccion]])}</div>
                ) : null}
              </div>

              {/* Galería de trabajos → entrena a la IA con el estilo del tatuador */}
              {tab === "tatuadores" && (
                <div className="rounded-lg border border-[#37C7C0]/30 bg-[#37C7C0]/5 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-[#37C7C0]">
                    <Brain size={14} /> Estilo del tatuador (IA)
                  </div>
                  <p className="mb-2 text-[11px] leading-relaxed text-bone-dim">
                    Sube 3–6 fotos de SUS trabajos y dale “Entrenar IA”: Ana aprende su estilo y lo recomienda
                    cuando la idea de un cliente encaja con él.
                  </p>
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#37C7C0]/40 px-3 py-2 text-sm text-[#37C7C0] hover:bg-[#37C7C0]/10">
                    <ImagePlus size={15} /> {uploading ? "Subiendo…" : "Subir fotos de sus trabajos"}
                    <input type="file" accept="image/*" multiple onChange={handleGaleriaFiles} className="hidden" />
                  </label>
                  {((editing.galeria as string[]) || []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {((editing.galeria as string[]) || []).map((g, i) => (
                        <span key={g + i} className="flex items-center gap-1 rounded bg-navy-soft px-1.5 py-0.5 text-[10px] text-bone-dim">
                          📎 …{g.slice(-18)}
                          <button
                            onClick={() => setEditing((prev) => (prev ? { ...prev, galeria: ((prev.galeria as string[]) || []).filter((_, j) => j !== i) } : prev))}
                            className="text-bone-dim hover:text-red-400"
                            aria-label="Quitar foto"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={entrenarIA}
                    disabled={training || !editing.id || ((editing.galeria as string[]) || []).length < 2}
                    title={!editing.id ? "Guarda primero el tatuador" : ((editing.galeria as string[]) || []).length < 2 ? "Sube al menos 2 fotos" : "Analizar sus fotos y aprender su estilo"}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#37C7C0] px-3 py-2 text-sm font-semibold text-navy transition hover:brightness-110 disabled:opacity-40"
                  >
                    <Brain size={15} /> {training ? "La IA está mirando las fotos…" : editing.estiloIA ? "Reentrenar IA" : "Entrenar IA"}
                  </button>
                  {!!editing.estiloIA && (
                    <div className="mt-2 rounded-lg border border-line/60 bg-navy px-2.5 py-2 text-[11px] leading-relaxed text-bone-dim">
                      <span className="font-semibold text-[#37C7C0]">Lo que la IA aprendió:</span> {String(editing.estiloIA)}
                    </div>
                  )}
                </div>
              )}

              {FIELDS[tab as Coleccion].map(([k, label, type]) => (
                <label key={k} className="block">
                  <span className="text-[11px] text-bone-dim">{label}</span>
                  {type === "area" ? (
                    <textarea
                      value={(editing[k] as string) || ""}
                      onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-line bg-navy-soft px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
                    />
                  ) : type === "bool" ? (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, [k]: !editing[k] })}
                      className={`mt-1 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${editing[k] ? "border-[#3FB37F]/50 text-[#3FB37F]" : "border-line text-bone-dim"}`}
                    >
                      {editing[k] ? "Sí" : "No"}
                      <span className={`h-3 w-3 rounded-full ${editing[k] ? "bg-[#3FB37F]" : "bg-line"}`} />
                    </button>
                  ) : (
                    <input
                      type={type === "date" ? "date" : "text"}
                      value={(editing[k] as string) || ""}
                      onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-line bg-navy-soft px-3 py-2 text-sm text-bone outline-none focus:border-gold/50"
                    />
                  )}
                </label>
              ))}
              <button onClick={save} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-soft">
                <Save size={15} /> Guardar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
