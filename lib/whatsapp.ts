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
