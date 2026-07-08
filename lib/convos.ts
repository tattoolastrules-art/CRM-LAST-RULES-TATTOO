// Conversaciones REALES de WhatsApp (clave "convos" en Neon).
// El webhook agrega lo entrante y las respuestas de Ana; el panel agrega lo del equipo.
import { loadJSON, saveJSON } from "./store";

export interface ConvoMsg {
  id: string;
  sender: "coleccionista" | "ana" | "equipo";
  text: string;
  at: string;
  img?: string; // miniatura en dataURL (fotos enviadas/recibidas)
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
  img?: string,
): Promise<void> {
  if (!contacto || (!text && !img)) return;
  const convos = await getConvos();
  let c = convos.find((x) => x.id === contacto);
  const now = new Date().toISOString();
  if (!c) {
    c = { id: contacto, nombre: nombre || contacto, canal: "whatsapp", messages: [], lastAt: now, unread: false };
    convos.unshift(c);
  }
  if (nombre && c.nombre === c.id) c.nombre = nombre;
  c.messages.push({
    id: "m" + Date.now() + Math.random().toString(36).slice(2, 6),
    sender,
    text: String(text || "").slice(0, 1500),
    at: now,
    ...(img && img.length < 300000 ? { img } : {}),
  });
  if (c.messages.length > 80) c.messages = c.messages.slice(-80);
  // limita cuántas imágenes guardamos por conversación (peso en la base)
  const conImg = c.messages.filter((m) => m.img);
  if (conImg.length > 10) {
    const sobran = conImg.length - 10;
    let quitadas = 0;
    c.messages = c.messages.map((m) => {
      if (m.img && quitadas < sobran) { quitadas++; const { img: _drop, ...rest } = m; return rest as ConvoMsg; }
      return m;
    });
  }
  c.lastAt = now;
  c.unread = sender === "coleccionista";
  await saveJSON("convos", convos.slice(0, 120));
}

export async function markConvoRead(id: string): Promise<void> {
  const convos = await getConvos();
  const c = convos.find((x) => x.id === id);
  if (c) { c.unread = false; await saveJSON("convos", convos); }
}
