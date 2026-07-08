// Envío de mensajes por WhatsApp Cloud API. Requiere en el entorno:
//   WHATSAPP_TOKEN     (token permanente de Meta)
//   WHATSAPP_PHONE_ID  (Phone Number ID)

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
