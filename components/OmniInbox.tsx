"use client";

import { useState, useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Search,
  Smile,
  Paperclip,
  Send,
  Sparkles,
  Camera,
  ThumbsUp,
  MessageCircleMore,
} from "lucide-react";
import type { Conversation, Channel, Message } from "@/lib/types";

type Item = Conversation & { real?: boolean };
const EMOJIS = ["🖤", "🤍", "✨", "👑", "😊", "🙌", "🔥", "🙏"];

// Reduce la imagen en el navegador antes de enviarla por WhatsApp
async function resizeImage(file: File, maxDim = 1600, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) { const r = Math.min(maxDim / w, maxDim / h); w = Math.round(w * r); h = Math.round(h * r); }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/jpeg", quality);
    };
    img.onerror = () => reject(new Error("img error"));
    img.src = URL.createObjectURL(file);
  });
}

function mapReal(list: Array<Record<string, unknown>>): Item[] {
  return list.map((c) => ({
    id: "r:" + c.id,
    contact: { name: (c.nombre as string) || (c.id as string), avatarHue: 150 },
    channel: "whatsapp" as Channel,
    stage: "nuevo",
    idea: "",
    unread: !!c.unread,
    lastAt: c.lastAt as string,
    messages: ((c.messages as Array<Record<string, string>>) || []).map((m) => ({
      id: m.id,
      at: m.at,
      text: m.text,
      sender: m.sender === "coleccionista" ? "coleccionista" : m.sender === "equipo" ? "maestro" : "lana",
    })),
    real: true,
  })) as unknown as Item[];
}
import { SEED_CONVERSATIONS } from "@/lib/seed-conversations";
import { CHANNEL_LABELS } from "@/lib/types";
import { CHANNEL_COLOR } from "@/lib/brand";

function chIcon(ch: Channel, size = 12) {
  if (ch === "instagram") return <Camera size={size} />;
  if (ch === "facebook") return <ThumbsUp size={size} />;
  return <MessageCircleMore size={size} />;
}

function timeOf(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export default function OmniInbox() {
  const [convos, setConvos] = useState<Conversation[]>(SEED_CONVERSATIONS);
  const [selectedId, setSelectedId] = useState<string>(SEED_CONVERSATIONS[0].id);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [chFilter, setChFilter] = useState<Channel | "all">("all");
  const [mobileChat, setMobileChat] = useState(false); // en celular: lista ↔ chat
  const [real, setReal] = useState<Item[]>([]);
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Conversaciones REALES de WhatsApp (se refrescan solas)
  useEffect(() => {
    let on = true;
    async function loadReal() {
      try {
        const r = await fetch("/api/convos");
        if (!r.ok) return;
        const d = await r.json();
        if (on) setReal(mapReal(d.convos || []));
      } catch {}
    }
    loadReal();
    const t = setInterval(loadReal, 20000);
    return () => { on = false; clearInterval(t); };
  }, []);

  const all: Item[] = [...real, ...(convos as Item[])];
  const selected = all.find((c) => c.id === selectedId) ?? all[0];

  const TABS: { id: Channel | "all"; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "whatsapp", label: "WhatsApp" },
    { id: "instagram", label: "Instagram" },
    { id: "facebook", label: "Facebook" },
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages.length, selectedId]);

  const list = all
    .filter((c) => (chFilter === "all" ? true : c.channel === chFilter))
    .filter((c) =>
      query
        ? c.contact.name.toLowerCase().includes(query.toLowerCase())
        : true,
    )
    .sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));

  function pick(c: Item) {
    setSelectedId(c.id);
    setMobileChat(true);
    if (c.real && c.unread) {
      setReal((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: false } : x)));
      fetch("/api/convos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "read", id: c.id.slice(2) }) }).catch(() => {});
    }
  }

  function send(text: string) {
    if (!text.trim() || !selected) return;
    const now = new Date().toISOString();

    if (selected.real) {
      // Envío REAL por WhatsApp
      const contacto = selected.id.slice(2);
      const msg: Message = { id: `m_${Date.now()}`, sender: "maestro", text: text.trim(), at: now };
      setReal((prev) => prev.map((c) => (c.id === selected.id ? { ...c, messages: [...c.messages, msg], lastAt: now } : c)));
      setDraft("");
      setSending(true);
      fetch("/api/convos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", contacto, text: text.trim() }) })
        .then(async (r) => { if (!r.ok) alert((await r.json()).error || "No se pudo enviar por WhatsApp"); })
        .catch(() => alert("Error de conexión"))
        .finally(() => setSending(false));
      return;
    }

    const msg: Message = { id: `m_${Date.now()}`, sender: "lana", text: text.trim(), at: now };
    setConvos((prev) =>
      prev.map((c) =>
        c.id === selectedId
          ? { ...c, messages: [...c.messages, msg], unread: false, lastAt: now }
          : c,
      ),
    );
    setDraft("");
  }

  function pickFile() {
    if (!selected?.real) {
      alert("Los adjuntos funcionan en los chats REALES de WhatsApp 🖤 (este es de demostración)");
      return;
    }
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !selected?.real) return;
    setSending(true);
    try {
      const blob = await resizeImage(f);
      const fd = new FormData();
      fd.append("file", blob, "foto.jpg");
      fd.append("contacto", selected.id.slice(2));
      if (draft.trim()) fd.append("caption", draft.trim());
      const r = await fetch("/api/convos", { method: "POST", body: fd });
      const d = await r.json();
      if (r.ok) { setReal(mapReal(d.convos || [])); setDraft(""); }
      else alert(d.error || "No se pudo enviar la imagen");
    } finally {
      setSending(false);
      e.target.value = "";
    }
  }

  async function suggest() {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: selected.messages.map((m) => ({
            role: m.sender === "coleccionista" ? "user" : "assistant",
            content: m.text,
          })),
          context: { name: selected.contact.name, idea: selected.idea, stage: selected.stage },
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) setDraft(data.reply);
      else setDraft(data.error ? `⚠️ ${data.error}` : "");
    } catch {
      setDraft("⚠️ Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full bg-[#0b141a]">
      {/* Lista de chats (estilo WhatsApp) */}
      <div className={`w-full shrink-0 flex-col border-r border-black/40 sm:w-[320px] ${mobileChat ? "hidden sm:flex" : "flex"}`}>
        <div className="bg-[#202c33] px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-lg bg-[#111b21] px-3 py-1.5">
            <Search size={15} className="text-[#8696a0]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar conversación"
              className="w-full bg-transparent text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]"
            />
          </div>
          <div className="mt-2 flex gap-1.5">
            {TABS.map((t) => {
              const n =
                t.id === "all"
                  ? all.length
                  : all.filter((c) => c.channel === t.id).length;
              const active = chFilter === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setChFilter(t.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] transition ${
                    active
                      ? "bg-[#00a884] text-[#0b141a]"
                      : "bg-[#111b21] text-[#8696a0] hover:text-[#e9edef]"
                  }`}
                >
                  {t.label} {n > 0 && <span className="opacity-70">{n}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.map((c) => {
            const last = c.messages[c.messages.length - 1];
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => pick(c)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                  active ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
                }`}
              >
                <div
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-[#0b141a]"
                  style={{ background: `hsl(${c.contact.avatarHue ?? 40} 50% 62%)` }}
                >
                  {c.contact.name.replace("@", "").slice(0, 2).toUpperCase()}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0b141a]"
                    style={{ background: CHANNEL_COLOR[c.channel], color: "#fff" }}
                  >
                    {chIcon(c.channel, 8)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 border-b border-white/5 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-[#e9edef]">
                      <span className="truncate">{c.contact.name}</span>
                      {(c as Item).real && (
                        <span className="shrink-0 rounded bg-[#00a884]/20 px-1 py-0.5 text-[8px] font-bold tracking-wide text-[#00a884]">EN VIVO</span>
                      )}
                    </span>
                    <span className="text-[10px] text-[#8696a0]">
                      {timeOf(c.lastAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-[#8696a0]">
                      {last?.sender !== "coleccionista" && "✓ "}
                      {last?.text}
                    </span>
                    {c.unread && (
                      <span className="h-4 min-w-4 rounded-full bg-[#00a884] px-1 text-center text-[10px] font-bold text-[#0b141a]">
                        1
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversación (estilo WhatsApp) */}
      <div
        className={`flex-1 flex-col ${mobileChat ? "flex" : "hidden sm:flex"}`}
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 bg-[#202c33] px-4 py-2">
          <button onClick={() => setMobileChat(false)} className="-ml-1 text-[#8696a0] hover:text-[#e9edef] sm:hidden" aria-label="Volver">
            <ArrowLeft size={20} />
          </button>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-[#0b141a]"
            style={{ background: `hsl(${selected.contact.avatarHue ?? 40} 50% 62%)` }}
          >
            {selected.contact.name.replace("@", "").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-[#e9edef]">
              {selected.contact.name}
            </div>
            <div
              className="flex items-center gap-1 text-[11px]"
              style={{ color: CHANNEL_COLOR[selected.channel] }}
            >
              {chIcon(selected.channel, 11)} {CHANNEL_LABELS[selected.channel]}
              {selected.real && <span className="text-[#00a884]"> · en vivo</span>}
              {selected.contact.city && (
                <span className="text-[#8696a0]"> · {selected.contact.city}</span>
              )}
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div className="flex-1 space-y-1.5 overflow-y-auto px-6 py-4">
          {selected.messages.map((m) => {
            const mine = m.sender !== "coleccionista";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[68%] rounded-lg px-2.5 py-1.5 text-sm leading-snug shadow ${
                    mine
                      ? "rounded-tr-none bg-[#005c4b] text-[#e9edef]"
                      : "rounded-tl-none bg-[#202c33] text-[#e9edef]"
                  }`}
                >
                  {m.sender === "maestro" && (
                    <div className="mb-0.5 text-[10px] font-semibold text-[#00a884]">
                      Los Maestros
                    </div>
                  )}
                  {m.text}
                  <span className="ml-2 align-bottom text-[9px] text-white/40">
                    {timeOf(m.at)}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Input estilo WhatsApp */}
        <div className="bg-[#202c33] px-3 py-2">
          {draft && (
            <div className="mb-2 flex justify-end">
              <button
                onClick={suggest}
                disabled={loading}
                className="flex items-center gap-1 rounded-full bg-[#0b141a] px-2.5 py-1 text-xs text-gold-soft"
              >
                <Sparkles size={12} /> regenerar
              </button>
            </div>
          )}
          {emojiOpen && (
            <div className="mb-2 flex gap-1.5">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => setDraft((d) => d + e)} className="rounded-lg bg-[#0b141a] px-2 py-1 text-lg transition hover:bg-[#2a3942]">
                  {e}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={suggest}
              disabled={loading}
              title="Ana sugiere la respuesta"
              className="rounded-full p-1.5 text-gold transition hover:bg-white/5 disabled:opacity-50"
            >
              <Sparkles size={20} />
            </button>
            <button onClick={() => setEmojiOpen((v) => !v)} title="Emojis" className={`rounded-full p-1 transition hover:bg-white/5 ${emojiOpen ? "text-[#00a884]" : "text-[#8696a0]"}`}>
              <Smile size={22} />
            </button>
            <button onClick={pickFile} title="Adjuntar foto" className="rounded-full p-1 text-[#8696a0] transition hover:bg-white/5 hover:text-[#e9edef]">
              <Paperclip size={20} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send(draft);
              }}
              placeholder={sending ? "Enviando…" : loading ? "Ana está escribiendo…" : selected?.real ? "Escribe (se envía por WhatsApp real)" : "Escribe un mensaje"}
              className="flex-1 rounded-lg bg-[#2a3942] px-3 py-2 text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]"
            />
            <button
              onClick={() => send(draft)}
              disabled={!draft.trim() || sending}
              className="rounded-full bg-[#00a884] p-2 text-[#0b141a] disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
