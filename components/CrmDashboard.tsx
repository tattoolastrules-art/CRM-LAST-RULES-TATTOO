"use client";

import { useState } from "react";
import { Camera, ThumbsUp, MessageCircleMore, Search } from "lucide-react";
import type { Channel, Stage } from "@/lib/types";
import { STAGE_LABELS } from "@/lib/types";
import { STAGE_COLOR, CHANNEL_COLOR } from "@/lib/brand";
import { SEED_CONVERSATIONS } from "@/lib/seed-conversations";

function chIcon(ch: Channel, size = 13) {
  if (ch === "instagram") return <Camera size={size} />;
  if (ch === "facebook") return <ThumbsUp size={size} />;
  return <MessageCircleMore size={size} />;
}

const FUNNEL: Stage[] = [
  "nuevo",
  "calificando",
  "cotizado",
  "asesoria",
  "agendando",
  "abono",
  "cerrado",
];

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

export default function CrmDashboard() {
  const [filter, setFilter] = useState<Stage | "todos">("todos");
  const [q, setQ] = useState("");
  const leads = SEED_CONVERSATIONS;

  const count = (s: Stage) => leads.filter((l) => l.stage === s).length;
  const enCierre = leads.filter((l) =>
    ["agendando", "abono", "cerrado", "asesoria"].includes(l.stage),
  ).length;
  const cerrados = leads.filter((l) => l.stage === "cerrado").length;

  const rows = leads
    .filter((l) => (filter === "todos" ? true : l.stage === filter))
    .filter((l) =>
      q
        ? (l.contact.name + " " + (l.idea ?? "") + " " + (l.contact.city ?? ""))
            .toLowerCase()
            .includes(q.toLowerCase())
        : true,
    )
    .sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* KPIs */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Leads totales" value={leads.length} />
        <Kpi label="En cierre" value={enCierre} gold />
        <Kpi label="Cerrados" value={cerrados} />
        <Kpi
          label="Tasa de cierre"
          value={`${Math.round((cerrados / leads.length) * 100)}%`}
        />
      </div>

      {/* Embudo */}
      <div className="glass mb-5 rounded-xl p-4">
        <div className="mb-3 text-[11px] uppercase tracking-widest text-bone-dim">
          Embudo
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {FUNNEL.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(filter === s ? "todos" : s)}
              className="flex-1 rounded-lg px-2 py-2 text-center transition hover:brightness-125"
              style={{ background: STAGE_COLOR[s] + "1f" }}
            >
              <div
                className="text-lg font-semibold"
                style={{ color: STAGE_COLOR[s] }}
              >
                {count(s)}
              </div>
              <div className="text-[10px] text-bone-dim">{STAGE_LABELS[s]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de leads */}
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
              <th className="px-4 py-2 font-medium">Idea</th>
              <th className="px-4 py-2 font-medium">Ciudad</th>
              <th className="px-4 py-2 font-medium">Etapa</th>
              <th className="px-4 py-2 font-medium">Último</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr
                key={l.id}
                className="border-t border-line/40 transition hover:bg-[#161d2e]"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-navy"
                      style={{
                        background: `hsl(${l.contact.avatarHue ?? 40} 50% 62%)`,
                      }}
                    >
                      {l.contact.name.replace("@", "").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-bone">{l.contact.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: CHANNEL_COLOR[l.channel] }}
                  >
                    {chIcon(l.channel)} {l.channel}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-bone-dim">
                  {l.idea ?? "—"}
                  {l.zona && <span className="text-[11px]"> · {l.zona}</span>}
                </td>
                <td className="px-4 py-2.5 text-bone-dim">
                  {l.contact.city ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className="rounded px-2 py-0.5 text-[10px] uppercase tracking-wide"
                    style={{
                      background: STAGE_COLOR[l.stage] + "22",
                      color: STAGE_COLOR[l.stage],
                    }}
                  >
                    {STAGE_LABELS[l.stage]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-[11px] text-bone-dim">
                  {timeOf(l.lastAt)}
                  {l.unread && (
                    <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-gold align-middle" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  gold,
}: {
  label: string;
  value: string | number;
  gold?: boolean;
}) {
  return (
    <div className="glass rounded-xl px-4 py-3">
      <div
        className={`text-2xl font-semibold ${gold ? "text-gold" : "text-bone"}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] uppercase tracking-wide text-bone-dim">
        {label}
      </div>
    </div>
  );
}
