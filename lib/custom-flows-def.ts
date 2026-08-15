// Parte PURA de los flujos personalizados (sin almacenamiento): tipos,
// saneo y conversión a FlowDef. Este módulo es seguro para el navegador;
// la persistencia (Neon/JSON) vive en custom-flows.ts (solo servidor).

import type { FlowDef, FlowNode, FlowEdge } from "./flows";

export interface CustomFlowOption {
  label: string; // lo que el cliente elige/escribe (botón)
  reply: string; // lo que Ana responde a esa opción
}

export interface CustomFlow {
  id: string; // "c" + aleatorio
  name: string;
  goal: string; // objetivo del flujo (qué debe lograr)
  channel: "whatsapp" | "instagram" | "facebook" | "all";
  keywords: string[]; // palabras que lo disparan
  welcome: string; // primer mensaje de Ana
  options: CustomFlowOption[]; // hasta 4 caminos
  closing: string; // cierre con CTA (siguiente paso)
  active: boolean;
  createdAt: string;
}

const limpia = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

export function sanitizeCustomFlow(raw: Partial<CustomFlow>): CustomFlow {
  return {
    id: /^c[a-z0-9]{4,12}$/.test(String(raw.id || "")) ? String(raw.id) : "c" + Math.random().toString(36).slice(2, 8),
    name: limpia(raw.name, 60) || "Flujo sin nombre",
    goal: limpia(raw.goal, 200),
    channel: (["whatsapp", "instagram", "facebook", "all"] as const).includes(raw.channel as "all") ? (raw.channel as CustomFlow["channel"]) : "all",
    keywords: (Array.isArray(raw.keywords) ? raw.keywords : [])
      .map((k) => limpia(k, 40).toLowerCase())
      .filter((k) => k.length >= 3) // 1-2 letras dispararían el flujo en casi cualquier mensaje
      .slice(0, 10),
    welcome: limpia(raw.welcome, 600),
    options: (Array.isArray(raw.options) ? raw.options : [])
      .map((o) => ({ label: limpia(o?.label, 60), reply: limpia(o?.reply, 600) }))
      .filter((o) => o.label && o.reply)
      .slice(0, 4),
    closing: limpia(raw.closing, 600),
    active: raw.active !== false,
    createdAt: String(raw.createdAt || new Date().toISOString()),
  };
}

// Convierte el flujo del asistente en un FlowDef dibujable (lienzo y vista lista)
export function customToFlowDef(cf: CustomFlow, index: number): FlowDef {
  const X = [40, 360, 700, 1040, 1380];
  const nodes: FlowNode[] = [
    { id: "t", kind: "trigger", x: X[0], y: 180, title: "Disparador", text: cf.keywords.join(" · ") || "(sin palabras clave)" },
    { id: "m1", kind: "message", x: X[1], y: 180, title: "Mensaje de Ana", text: cf.welcome },
  ];
  const edges: FlowEdge[] = [{ from: "t", to: "m1" }];

  if (cf.options.length) {
    nodes.push({ id: "c1", kind: "choice", x: X[2], y: 170, title: "¿Qué responde?", options: cf.options.map((o) => o.label) });
    edges.push({ from: "m1", to: "c1" });
    cf.options.forEach((o, i) => {
      const id = "o" + (i + 1);
      nodes.push({ id, kind: "message", x: X[3], y: 40 + i * 130, title: o.label, text: o.reply });
      edges.push({ from: "c1", to: id, fromOption: i });
      if (cf.closing) edges.push({ from: id, to: "mf" });
    });
  }
  if (cf.closing) {
    nodes.push({ id: "mf", kind: "message", x: X[cf.options.length ? 4 : 2], y: 180, title: "Cierre", text: cf.closing });
    if (!cf.options.length) edges.push({ from: "m1", to: "mf" });
    nodes.push({ id: "h1", kind: "handoff", x: X[cf.options.length ? 4 : 2] + 320, y: 180, title: "→ F5 Agendamiento", text: "" });
    edges.push({ from: "mf", to: "h1" });
  }

  return {
    id: cf.id,
    code: "P" + (index + 1),
    name: cf.name,
    desc: cf.goal || "Flujo creado con el asistente",
    channel: cf.channel,
    nodes,
    edges,
  };
}
