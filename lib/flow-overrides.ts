// Textos de los flujos editados desde el OS (Alejandro/admin edita los mensajes).
// Se guardan como overrides por flujo/nodo en Neon (clave "flow_overrides").
import { loadJSON, saveJSON } from "./store";

export type FlowOverrides = Record<string, Record<string, string>>;

export async function getFlowOverrides(): Promise<FlowOverrides> {
  return loadJSON<FlowOverrides>("flow_overrides", {});
}

export async function setFlowOverride(flowId: string, nodeId: string, text: string): Promise<FlowOverrides> {
  const o = await getFlowOverrides();
  o[flowId] = { ...(o[flowId] || {}), [nodeId]: String(text).slice(0, 600) };
  await saveJSON("flow_overrides", o);
  return o;
}
