// Envío de DMs por la Send API de Meta (Messenger e Instagram) con el token de página.
// Requiere FB_PAGE_TOKEN con pages_messaging (+ instagram_manage_messages para IG).
const GRAPH = "https://graph.facebook.com/v23.0";

export function fbConfigured(): boolean {
  return !!process.env.FB_PAGE_TOKEN;
}

export async function sendMetaDM(recipientId: string, text: string): Promise<void> {
  const token = process.env.FB_PAGE_TOKEN;
  if (!token) throw new Error("FB_PAGE_TOKEN no configurado");
  const r = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      messaging_type: "RESPONSE",
      message: { text: text.slice(0, 1000) },
    }),
  });
  if (!r.ok) throw new Error("Meta send: " + (await r.text()).slice(0, 300));
}

// Nombre del contacto (mejor esfuerzo: Messenger da name; Instagram da username)
// OJO: pedir name y username JUNTOS revienta en Messenger (username es solo de IG).
export async function fetchMetaName(senderId: string): Promise<string> {
  const token = process.env.FB_PAGE_TOKEN;
  if (!token || !senderId) return "";
  for (const campo of ["name", "username"] as const) {
    try {
      const r = await fetch(`${GRAPH}/${senderId}?fields=${campo}&access_token=${encodeURIComponent(token)}`);
      if (!r.ok) continue;
      const d = (await r.json()) as { name?: string; username?: string };
      if (d.name) return d.name;
      if (d.username) return "@" + d.username;
    } catch {
      /* siguiente campo */
    }
  }
  return "";
}
