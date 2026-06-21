"use client";

import { useEffect, useState } from "react";
import { Camera, ThumbsUp, MessageCircleMore, Search, Globe, Users, Flame, Trophy, Percent, Inbox } from "lucide-react";
import type { Channel, Stage } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { STAGE_COLOR, CHANNEL_COLOR } from "@/lib/brand";
import { SEED_CONVERSATIONS } from "@/lib/seed-conversations";

type Row = {
  id: string;
  contact: { name: string; city?: string; avatarHue?: number };
  channel: Channel | "web";
  idea?: string;
  zona?: string;
  stage: Stage;
  lastAt: string;
  unread?: boolean;
  isWeb?: boolean;
};

function chIcon(ch: Row["channel"], size = 13) {
  if (ch === "instagram") return <Camera size={size} />;
  if (ch === "facebook") return <ThumbsUp size={size} />;
  if (ch === "web") return <Globe size={size} />;
  return <MessageCircleMore size={size} />;
}
const chColor = (ch: Row["channel"]) => (ch === "web" ? "#37C7C0" : CHANNEL_COLOR[ch as Channel]);

const FUNNEL: Stage[] = ["nuevo", "calificando", "cotizado", "asesoria", "agendando", "abono", "cerrado"];
const ESTADO_STAGE: Record<string, Stage> = { nuevo: "nuevo", contactado: "calificando", agendado: "agendando", descartado: "perdido" };

const timeOf = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function CrmDashboard() {
  const [filter, setFilter] = useState<Stage | "todos">("todos");
  const [q, setQ] = useState("");
  const [webLeads, setWebLeads] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/lead")
      .then((r) => (r.ok ? r.json() : { leads: [] }))
      .then((d) => {
        const mapped: Row[] = (d.leads || []).map((l: Record<string, string>) => ({
          id: "web-" + l.id,
          contact: { name: l.nombre || "(sin nombre)", city: "", avatarHue: 175 },
          channel: "web" as const,
          idea: [l.servicio, l.idea].filter(Boolean).join(" · ") || l.presupuesto || "—",
          stage: ESTADO_STAGE[l.estado] || "nuevo",
          lastAt: l.fecha,
          unread: l.estado === "nuevo",
          isWeb: true,
        }));
        setWebLeads(mapped);
      })
      .catch(() => {});
  }, []);

  const leads: Row[] = [...webLeads, ...(SEED_CONVERSATIONS as unknown as Row[])];

  const count = (s: Stage) => leads.filter((l) => l.stage === s).length;
  const enCierre = leads.filter((l) => ["agendando", "abono", "cerrado", "asesoria"].includes(l.stage)).length;
  const cerrados = leads.filter((l) => l.stage === "cerrado").length;
  const nuevasWeb = webLeads.filter((l) => l.unread).length;
  const maxFunnel = Math.max(1, ...FUNNEL.map(count));

  const rows = leads
    .filter((l) => (filter === "todos" ? true : l.stage === filter))
    .filter((l) =>
      q ? (l.contact.name + " " + (l.idea ?? "") + " " + (l.contact.city ?? "")).toLowerCase().includes(q.toLowerCase()) : true,
    )
    .sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Leads totales" value={leads.length} Icon={Users} />
        <Kpi label="Reservas web" value={webLeads.length} Icon={Inbox} accent="#37C7C0" sub={nuevasWeb ? nuevasWeb + " nuevas" : undefined} />
        <Kpi label="En cierre" value={enCierre} Icon={Flame} gold />
        <Kpi label="Cerrados" value={cerrados} Icon={Trophy} />
        <Kpi label="Tasa de cierre" value={`${Math.round((cerrados / leads.length) * 100)}%`} Icon={Percent} />
      </div>

      {/* Embudo */}
      <div className="glass mb-5 rounded-xl p-4">
        <div className="mb-3 text-[11px] uppercase tracking-widest text-bone-dim">Embudo de conversión</div>
        <div className="flex items-end gap-2" style={{ height: 124 }}>
          {FUNNEL.map((s) => {
            const c = count(s);
            return (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? "todos" : s)}
                className={`group flex flex-1 flex-col items-center justify-end rounded-lg p-1 transition ${filter === s ? "bg-gold/10 ring-1 ring-gold/50" : "hover:bg-white/5"}`}
              >
                <div className="mb-1 text-sm font-semibold" style={{ color: STAGE_COLOR[s] }}>{c}</div>
                <div
                  className="w-full rounded-t-md transition-all duration-500 group-hover:brightness-125"
                  style={{ height: Math.max(6, (c / maxFunnel) * 80), background: `linear-gradient(to top, ${STAGE_COLOR[s]}, ${STAGE_COLOR[s]}55)` }}
                />
                <div className="mt-1.5 text-[9px] leading-tight text-bone-dim">{STAGE_LABELS[s]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla */}
      <div className="glass overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-2.5">
          <div className="text-sm font-medium text-bone">
            Coleccionistas {filter !== "todos" && `· ${STAGE_LABELS[filter]}`}
            <span className="ml-1 text-bone-dim">({rows.length})</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-navy-soft px-2.5 py-1">
            <Search size={13} className="text-bone-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar lead…"
              className="w-40 bg-transparent text-xs text-bone outline-none placeholder:text-bone-dim"
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-bone-dim">
              <th className="px-4 py-2 font-medium">Coleccionista</th>
              <th className="px-4 py-2 font-medium">Canal</th>
              <th className="px-4 py-2 font-medium">Idea / Servicio</th>
              <th className="px-4 py-2 font-medium">Etapa</th>
              <th className="px-4 py-2 font-medium">Último</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-t border-line/40 transition hover:bg-[#161d2e]" style={l.isWeb ? { boxShadow: "inset 3px 0 0 #37C7C0" } : undefined}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-navy" style={{ background: `hsl(${l.contact.avatarHue ?? 40} 55% 60%)` }}>
                      {l.contact.name.replace("@", "").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-bone">{l.contact.name}</span>
                    {l.isWeb && <span className="rounded bg-[#37C7C0]/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#37C7C0]">web</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 text-xs" style={{ color: chColor(l.channel) }}>
                    {chIcon(l.channel)} {l.channel}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-bone-dim">
                  {l.idea ?? "—"}
                  {l.zona && <span className="text-[11px]"> · {l.zona}</span>}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wide" style={{ background: STAGE_COLOR[l.stage] + "22", color: STAGE_COLOR[l.stage] }}>
                    {STAGE_LABELS[l.stage]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[11px] text-bone-dim">
                  {timeOf(l.lastAt)}
                  {l.unread && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-gold align-middle" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value, gold, Icon, sub, accent }: {
  label: string; value: string | number; gold?: boolean;
  Icon: typeof Users; sub?: string; accent?: string;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-xl px-4 py-3">
      <div className="absolute right-3 top-3 opacity-20"><Icon size={26} style={accent ? { color: accent } : undefined} /></div>
      <div className={`text-2xl font-semibold ${gold ? "text-gold" : "text-bone"}`} style={accent ? { color: accent } : undefined}>{value}</div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-bone-dim">{label}</div>
      {sub && <div className="mt-0.5 text-[10px] text-[#37C7C0]">{sub}</div>}
    </div>
  );
}
