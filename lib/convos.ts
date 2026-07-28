// Conversaciones REALES de WhatsApp / Instagram / Messenger (clave "convos" en Neon).
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
  id: string; // el número (WhatsApp) o id de usuario (IG/Messenger) del contacto
  nombre: string;
  canal: "whatsapp" | "instagram" | "facebook";
  messages: ConvoMsg[];
  lastAt: string;
  unread: boolean;
  alert24?: string; // marca del último aviso de "ventana por vencerse" (ts del mensaje que lo disparó)
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
  canal?: Convo["canal"],
): Promise<void> {
  if (!contacto || (!text && !img)) return;
  const convos = await getConvos();
  let c = convos.find((x) => x.id === contacto);
  const now = new Date().toISOString();
  if (!c) {
    c = { id: contacto, nombre: nombre || contacto, canal: canal || "whatsapp", messages: [], lastAt: now, unread: false };
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

// Alerta de ventana de 24h: si un chat quedó SIN RESPONDER y le quedan pocas horas
// de ventana (WhatsApp/Meta solo dejan escribir libre 24h tras el último mensaje
// del cliente), avisa por push y al WhatsApp del estudio. Un solo aviso por ventana.
export async function checkWindowAlerts(): Promise<number> {
  const { pushAll } = await import("./push");
  const { notifyStudio } = await import("./notify");
  const convos = await getConvos();
  const now = Date.now();
  let avisos = 0;
  let changed = false;
  for (const c of convos) {
    const lastIn = [...c.messages].reverse().find((m) => m.sender === "coleccionista");
    if (!lastIn) continue;
    const last = c.messages[c.messages.length - 1];
    const restanteH = 24 - (now - new Date(lastIn.at).getTime()) / 3600e3;
    const sinResponder = last.sender === "coleccionista";
    if (sinResponder && restanteH > 0 && restanteH <= 6 && c.alert24 !== lastIn.at) {
      c.alert24 = lastIn.at;
      changed = true;
      avisos++;
      const h = Math.max(1, Math.floor(restanteH));
      const canal = c.canal === "whatsapp" ? "WhatsApp" : c.canal === "instagram" ? "Instagram" : "Messenger";
      pushAll(`⏳ Chat por vencerse · ${c.nombre}`, `Quedan ~${h}h para responder por ${canal}. Después solo con plantilla.`, "/os").catch(() => {});
      notifyStudio(`⏳ CHAT POR VENCERSE (${canal})\n${c.nombre}\nÚltimo mensaje sin responder — quedan ~${h} horas de ventana. Respondan ya o luego tocará plantilla.`).catch(() => {});
    }
  }
  if (changed) await saveJSON("convos", convos);
  return avisos;
}
