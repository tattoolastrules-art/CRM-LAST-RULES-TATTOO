// Almacén de eventos entrantes de Meta (webhooks: comentarios, mensajes, reacciones).
import { loadJSON, saveJSON } from "./store";

export interface MetaEvent {
  id: string; at: string; object: string; summary: string; raw: unknown;
}

export async function getMetaEvents(): Promise<MetaEvent[]> {
  return loadJSON<MetaEvent[]>("meta_events", []);
}

export async function addMetaEvent(e: MetaEvent) {
  const list = await getMetaEvents();
  list.unshift(e);
  await saveJSON("meta_events", list.slice(0, 200));
}
