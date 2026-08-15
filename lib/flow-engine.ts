// Motor de flujos: conecta los mensajes de los flujos (editables desde el OS)
// con las respuestas reales de Ana en WhatsApp.
// - matchFlow: si el mensaje del cliente dispara un flujo, responde con el
//   texto del flujo (predefinido, editable, SIN gastar tokens).
// - styleGuide: los mensajes clave (con las ediciones de Alejandro) se inyectan
//   al prompt de Ana para que la IA hable igual que los flujos aprobados.
// - Los flujos PERSONALIZADOS (asistente "Crear flujo") también disparan aquí.

import { FLOWS } from "./flows";
import { getFlowOverrides } from "./flow-overrides";
import { getCustomFlows } from "./custom-flows";

export async function flowText(flowId: string, nodeId: string): Promise<string> {
  const ov = await getFlowOverrides();
  const t = ov[flowId]?.[nodeId];
  if (t) return t;
  const f = FLOWS.find((x) => x.id === flowId);
  return f?.nodes.find((n) => n.id === nodeId)?.text || "";
}

const RULES: { re: RegExp; flow: string; node: string }[] = [
  { re: /(me\s+duele|duele|dolor|doloroso)/i, flow: "f4", node: "m1" },
  { re: /(cuidado|cicatriz|sanar|curaci[oó]n|se\s+infect|crema)/i, flow: "f4", node: "m2" },
  { re: /(freehand|mano\s+alzada)/i, flow: "f4", node: "m3" },
  { re: /(cu[aá]nto\s+(dura|tiempo|demora)|duraci[oó]n)/i, flow: "f4", node: "m4" },
  { re: /(precio|cu[aá]nto\s+(vale|cuesta|sale)|valor|cobran|muy\s+caro|descuento|rebaja|promoci[oó]n)/i, flow: "f7", node: "m1" },
  { re: /(soy\s+menor|tengo\s+1[0-7](?!\d)|menor\s+de\s+edad)/i, flow: "f9", node: "m1" },
  { re: /(ubicaci[oó]n|d[oó]nde\s+(quedan|est[aá]n)|direcci[oó]n|horario)/i, flow: "f1", node: "m2" },
  { re: /(abono|reservar|agendar|cita|apartar\s+cupo)/i, flow: "f5", node: "m2" },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export type Canal = "whatsapp" | "instagram" | "facebook";

// Flujos personalizados: disparador por palabra clave y respuesta a sus opciones.
// lastAna = el último mensaje que envió Ana: responder una opción (por número o
// por texto) solo cuenta si el menú de ESE flujo fue lo último que se mostró —
// sin ese contexto, una etiqueta como "precio" secuestraría cualquier chat.
// canal = por dónde escribe el cliente (respeta el "Solo WhatsApp/IG" del asistente).
async function matchCustom(text: string, lastAna: string, canal?: Canal): Promise<string | null> {
  const flows = (await getCustomFlows().catch(() => []))
    .filter((f) => f.active && (f.channel === "all" || !canal || f.channel === canal));
  if (!flows.length) return null;
  const t = text.toLowerCase();

  // ¿Respondió una de las opciones del menú que Ana acaba de mostrar?
  for (const f of flows) {
    const menuVisible = f.options.some((o) => lastAna.includes(o.label));
    if (!menuVisible) continue;
    for (let i = 0; i < f.options.length; i++) {
      const o = f.options[i];
      const porNumero = new RegExp(`^\\s*${i + 1}\\s*[).:]?\\s*$`).test(text);
      const porTexto = o.label.length >= 3 && t.includes(o.label.toLowerCase());
      if (porNumero || porTexto) {
        return o.reply + (f.closing ? "\n\n" + f.closing : "");
      }
    }
  }

  // ¿Disparó un flujo por palabra clave? → mensaje inicial (+ menú de opciones)
  // Frontera Unicode: \W trata á/ñ como separador y haría matches falsos.
  for (const f of flows) {
    const hit = f.keywords.some(
      (k) => k.length >= 3 && new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRe(k.toLowerCase())}`, "iu").test(t),
    );
    if (hit && f.welcome) {
      const menu = f.options.length
        ? "\n\n" + f.options.map((o, i) => `${i + 1}. ${o.label}`).join("\n")
        : "";
      return f.welcome + menu;
    }
  }
  return null;
}

export async function matchFlow(text: string, lastAna = "", canal?: Canal): Promise<string | null> {
  const t = (text || "").trim();
  if (!t) return null;

  // Primero los flujos creados por el estudio (más específicos que los genéricos)
  const custom = await matchCustom(t, lastAna, canal).catch(() => null);
  if (custom) return custom;

  for (const r of RULES) {
    if (r.re.test(t)) {
      const reply = await flowText(r.flow, r.node);
      if (reply) return reply;
    }
  }
  return null;
}

// Mensajes clave que guían el tono de la IA (respetan las ediciones del admin)
const GUIDE_IDS: [string, string][] = [
  ["f1", "m1"], ["f4", "m1"], ["f4", "m2"], ["f4", "m3"], ["f7", "m1"], ["f5", "m2"], ["f9", "m1"],
];

export async function styleGuide(): Promise<string> {
  const parts: string[] = [];
  for (const [f, n] of GUIDE_IDS) {
    const t = await flowText(f, n);
    if (t) parts.push("- " + t);
  }
  return parts.join("\n");
}
