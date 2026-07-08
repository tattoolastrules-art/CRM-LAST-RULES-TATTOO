// Conversaciones REALES de WhatsApp (clave "convos" en Neon).
// El webhook agrega lo entrante y las respuestas de Ana; el panel agrega lo del equipo.
import { loadJSON, saveJSON } from "./store";

export interface ConvoMsg {
  id: string;
  sender: "coleccionista" | "ana" | "equipo";
  text: string;
  at: string;
}
export interface Convo {
  id: string; // el número del contacto
  nombre: string;
  canal: "whatsapp";
  messages: ConvoMsg[];
  lastAt: string;
  unread: boolean;
}

export async function getConvos(): Promise<Convo[]> {
  return loadJSON<Convo[]>("convos", []);
}

export async function addConvoMsg(
  contacto: string,
  nombre: string,
  sender: ConvoMsg["sender"],
  text: string,
): Promise<void> {
  if (!contacto || !text) return;
  const convos = await getConvos();
  let c = convos.find((x) => x.id === contacto);
  const now = new Date().toISOString();
  if (!c) {
    c = { id: contacto, nombre: nombre || contacto, canal: "whatsapp", messages: [], lastAt: now, unread: false };
    convos.unshift(c);
  }
  if (nombre && c.nombre === c.id) c.nombre = nombre;
  c.messages.push({ id: "m" + Date.now() + Math.random().toString(36).slice(2, 6), sender, text: String(text).slice(0, 1500), at: now });
  if (c.messages.length > 80) c.messages = c.messages.slice(-80);
  c.lastAt = now;
  c.unread = sender === "coleccionista";
  await saveJSON("convos", convos.slice(0, 120));
}

export async function markConvoRead(id: string): Promise<void> {
  const convos = await getConvos();
  const c = convos.find((x) => x.id === id);
  if (c) { c.unread = false; await saveJSON("convos", convos); }
}
