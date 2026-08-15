// Flujos PERSONALIZADOS creados desde el OS con el asistente guiado ("Crear flujo").
// Persistencia en Neon/JSON (clave "custom_flows") — SOLO servidor.
// Los tipos y la conversión a FlowDef viven en custom-flows-def.ts (apto navegador).
// El motor (flow-engine) los usa: si un mensaje del cliente coincide con sus
// disparadores, Ana responde con los textos del flujo (predefinidos, SIN tokens).

import { loadJSON, saveJSON } from "./store";
import { sanitizeCustomFlow, type CustomFlow } from "./custom-flows-def";

export type { CustomFlow, CustomFlowOption } from "./custom-flows-def";
export { customToFlowDef, sanitizeCustomFlow } from "./custom-flows-def";

export async function getCustomFlows(): Promise<CustomFlow[]> {
  const list = await loadJSON<CustomFlow[]>("custom_flows", []);
  return Array.isArray(list) ? list : [];
}

export async function saveCustomFlow(raw: Partial<CustomFlow>): Promise<CustomFlow[]> {
  const flow = sanitizeCustomFlow(raw);
  const list = await getCustomFlows();
  const i = list.findIndex((f) => f.id === flow.id);
  if (i >= 0) list[i] = { ...flow, createdAt: list[i].createdAt };
  else {
    // tope claro en vez de recortar en silencio (lo guardado = lo devuelto)
    if (list.length >= 30) throw new Error("Máximo 30 flujos personalizados. Borra alguno para crear otro.");
    list.push(flow);
  }
  await saveJSON("custom_flows", list);
  return list;
}

export async function deleteCustomFlow(id: string): Promise<CustomFlow[]> {
  const list = (await getCustomFlows()).filter((f) => f.id !== id);
  await saveJSON("custom_flows", list);
  return list;
}
