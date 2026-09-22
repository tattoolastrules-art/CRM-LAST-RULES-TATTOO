// Envío de mensajes por WhatsApp Cloud API. Requiere en el entorno:
//   WHATSAPP_TOKEN     (token permanente de Meta)
//   WHATSAPP_PHONE_ID  (Phone Number ID)
import crypto from "crypto";

export function waConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}

// Descarga un archivo multimedia recibido (imagen/audio/etc.) en base64.
export async function fetchMediaBase64(mediaId: string): Promise<{ b64: string; mime: string } | null> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token || !mediaId) return null;
  try {
    const meta = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meta.ok) return null;
    const info = (await meta.json()) as { url?: string; mime_type?: string };
    if (!info.url) return null;
    const bin = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!bin.ok) return null;
    const buf = Buffer.from(await bin.arrayBuffer());
    if (buf.length > 4_500_000) return null; // demasiado grande para visión
    return { b64: buf.toString("base64"), mime: info.mime_type || "image/jpeg" };
  } catch {
    return null;
  }
}

// Sube una imagen a Meta y devuelve el media id (para enviarla por WhatsApp)
export async function uploadWhatsAppMedia(buf: Buffer, mime: string): Promise<string> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) throw new Error("Falta WHATSAPP_TOKEN / WHATSAPP_PHONE_ID");
  const fd = new FormData();
  fd.append("messaging_product", "whatsapp");
  fd.append("file", new Blob([new Uint8Array(buf)], { type: mime }), "foto.jpg");
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) throw new Error("upload media " + res.status + ": " + (await res.text()));
  const d = (await res.json()) as { id?: string };
  if (!d.id) throw new Error("upload sin id");
  return d.id;
}

export async function sendWhatsAppImage(to: string, mediaId: string, caption?: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) throw new Error("Falta WHATSAPP_TOKEN / WHATSAPP_PHONE_ID");
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "image", image: { id: mediaId, ...(caption ? { caption } : {}) } }),
  });
  if (!res.ok) throw new Error("WhatsApp image " + res.status + ": " + (await res.text()));
  return res.json();
}

// Envía una plantilla aprobada (permite escribir FUERA de la ventana de 24h).
// Los parámetros no pueden llevar saltos de línea ni espacios repetidos.
export async function sendWhatsAppTemplate(to: string, name: string, params: string[]) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) throw new Error("Falta WHATSAPP_TOKEN / WHATSAPP_PHONE_ID");
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name,
        language: { code: "es" },
        components: [
          { type: "body", parameters: params.map((t) => ({ type: "text", text: t.replace(/\s+/g, " ").trim().slice(0, 500) })) },
        ],
      },
    }),
  });
  if (!res.ok) throw new Error("WhatsApp template " + res.status + ": " + (await res.text()));
  return res.json();
}

// Envía un mensaje con BOTONES interactivos (máx 3, títulos de máx 20 caracteres).
// Es el equivalente en WhatsApp de las preguntas listas de Instagram/Messenger:
// el cliente toca un botón y la respuesta llega al webhook como button_reply.
export async function sendWhatsAppButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[],
) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) throw new Error("Falta WHATSAPP_TOKEN / WHATSAPP_PHONE_ID");
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body.slice(0, 1024) },
        action: {
          buttons: buttons.slice(0, 3).map((b) => ({
            type: "reply",
            // Array.from evita partir un emoji a la mitad (slice corta por UTF-16)
            reply: { id: b.id.slice(0, 256), title: Array.from(b.title).slice(0, 20).join("") },
          })),
        },
      },
    }),
  });
  if (!res.ok) throw new Error("WhatsApp buttons " + res.status + ": " + (await res.text()));
  return res.json();
}

// Envía el formulario nativo "Servicios" (WhatsApp Flows): cita, cotización,
// asesoría, cursos, retoque, cover-up, bono y preguntas frecuentes en un solo
// menú. Requiere WHATSAPP_FLOW_ID (el Flow ya creado y publicado en Meta).
export async function sendWhatsAppFlow(to: string, bodyText: string, cta: string, screen = "MENU") {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const flowId = process.env.WHATSAPP_FLOW_ID;
  if (!token || !phoneId) throw new Error("Falta WHATSAPP_TOKEN / WHATSAPP_PHONE_ID");
  if (!flowId) throw new Error("Falta WHATSAPP_FLOW_ID");
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "flow",
        body: { text: bodyText.slice(0, 1024) },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_token: crypto.randomUUID(),
            flow_id: flowId,
            flow_cta: cta.slice(0, 30),
            flow_action: "navigate",
            flow_action_payload: { screen, data: {} },
          },
        },
      },
    }),
  });
  if (!res.ok) throw new Error("WhatsApp flow " + res.status + ": " + (await res.text()));
  return res.json();
}

export async function sendWhatsAppText(to: string, text: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) throw new Error("Falta WHATSAPP_TOKEN / WHATSAPP_PHONE_ID en el entorno");

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  if (!res.ok) throw new Error("WhatsApp API " + res.status + ": " + (await res.text()));
  return res.json();
}
