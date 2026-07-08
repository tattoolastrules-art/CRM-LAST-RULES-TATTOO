// Motor de flujos: conecta los mensajes de los flujos (editables desde el OS)
// con las respuestas reales de Ana en WhatsApp.
// - matchFlow: si el mensaje del cliente dispara un flujo, responde con el
//   texto del flujo (predefinido, editable, SIN gastar tokens).
// - styleGuide: los mensajes clave (con las ediciones de Alejandro) se inyectan
//   al prompt de Ana para que la IA hable igual que los flujos aprobados.

import { FLOWS } from "./flows";
import { getFlowOverrides } from "./flow-overrides";

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

export async function matchFlow(text: string): Promise<string | null> {
  const t = (text || "").trim();
  if (!t) return null;
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
