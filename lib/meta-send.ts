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

// Private Reply oficial de Meta: manda un DM al autor de un comentario
// (válido hasta 7 días después del comentario; funciona en IG y FB)
export async function sendPrivateReply(commentId: string, text: string): Promise<void> {
  const token = process.env.FB_PAGE_TOKEN;
  if (!token) throw new Error("FB_PAGE_TOKEN no configurado");
  const r = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { comment_id: commentId },
      messaging_type: "RESPONSE",
      message: { text: text.slice(0, 1000) },
    }),
  });
  if (!r.ok) throw new Error("private reply: " + (await r.text()).slice(0, 300));
}

// Responde un comentario (IG: /replies · FB: /comments) con el token de página
export async function replyComment(commentId: string, platform: "instagram" | "facebook", text: string): Promise<void> {
  const token = process.env.FB_PAGE_TOKEN;
  if (!token) throw new Error("FB_PAGE_TOKEN no configurado");
  const path = platform === "instagram" ? `${commentId}/replies` : `${commentId}/comments`;
  const r = await fetch(`${GRAPH}/${path}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text.slice(0, 900) }),
  });
  if (!r.ok) throw new Error("reply comment: " + (await r.text()).slice(0, 300));
}

// Like a un comentario — SOLO Facebook (Instagram no expone like por API)
export async function likeComment(commentId: string): Promise<void> {
  const token = process.env.FB_PAGE_TOKEN;
  if (!token) throw new Error("FB_PAGE_TOKEN no configurado");
  const r = await fetch(`${GRAPH}/${commentId}/likes?access_token=${encodeURIComponent(token)}`, { method: "POST" });
  if (!r.ok) throw new Error("like comment: " + (await r.text()).slice(0, 300));
}

// Oculta / muestra un comentario (IG usa "hide", FB usa "is_hidden")
export async function hideComment(commentId: string, platform: "instagram" | "facebook", hide: boolean): Promise<void> {
  const token = process.env.FB_PAGE_TOKEN;
  if (!token) throw new Error("FB_PAGE_TOKEN no configurado");
  const body = platform === "instagram" ? { hide } : { is_hidden: hide };
  const r = await fetch(`${GRAPH}/${commentId}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("hide comment: " + (await r.text()).slice(0, 300));
}

// Descarga una imagen de un CDN de Meta (adjuntos de IG/Messenger) en base64 para la visión de Ana
export async function fetchUrlBase64(url: string): Promise<{ b64: string; mime: string } | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 4_500_000) return null;
    return { b64: buf.toString("base64"), mime: r.headers.get("content-type")?.split(";")[0] || "image/jpeg" };
  } catch {
    return null;
  }
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
