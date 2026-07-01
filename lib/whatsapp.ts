// Envío de mensajes por WhatsApp Cloud API. Requiere en el entorno:
//   WHATSAPP_TOKEN     (token permanente de Meta)
//   WHATSAPP_PHONE_ID  (Phone Number ID)

export function waConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
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
