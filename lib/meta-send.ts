// Envío de DMs y gestión de comentarios por la API de Meta (Messenger e Instagram).
// AUTOSUFICIENTE con el token: si FB_PAGE_TOKEN no es un token de página (p. ej.
// pegaron el del usuario del sistema), deriva el token de página al vuelo con
// GET /{page-id}?fields=access_token y lo cachea. Así cualquiera de los dos sirve.
const GRAPH = "https://graph.facebook.com/v23.0";
const PAGE_ID = process.env.FB_PAGE_ID || "797899886739979";

let cachedPageToken: string | null = null;

export function fbConfigured(): boolean {
  return !!process.env.FB_PAGE_TOKEN;
}

async function pageToken(): Promise<string> {
  if (cachedPageToken) return cachedPageToken;
  const envTok = process.env.FB_PAGE_TOKEN || "";
  if (!envTok) throw new Error("FB_PAGE_TOKEN no configurado");
  try {
    const r = await fetch(`${GRAPH}/${PAGE_ID}?fields=access_token&access_token=${encodeURIComponent(envTok)}`);
    const d = (await r.json()) as { access_token?: string };
    if (d.access_token) {
      cachedPageToken = d.access_token;
      return d.access_token;
    }
    if (r.status >= 400 && r.status < 500) {
      // respuesta definitiva del Graph (sin permiso de derivar): el del entorno es lo que hay
      cachedPageToken = envTok;
    }
    // 5xx / respuesta rara: NO cachear, reintentar el intercambio en la próxima llamada
  } catch {
    /* fallo de red transitorio: NO cachear el fallback */
  }
  return envTok;
}

export async function sendMetaDM(recipientId: string, text: string): Promise<void> {
  const token = await pageToken();
  const r = await fetch(`${GRAPH}/${PAGE_ID}/messages?access_token=${encodeURIComponent(token)}`, {
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

// Publica los "ice breakers" (preguntas listas al abrir el chat) en Instagram o
// Messenger vía messenger_profile. Se ven al iniciar una conversación nueva y
// el toque llega al webhook como postback con su payload.
export async function setIceBreakers(
  platform: "instagram" | "messenger",
  items: { question: string; payload: string }[],
): Promise<void> {
  const token = await pageToken();
  const url =
    `${GRAPH}/me/messenger_profile?access_token=${encodeURIComponent(token)}` +
    (platform === "instagram" ? "&platform=instagram" : "");
  const body = items.length
    ? {
        ice_breakers: [
          {
            locale: "default",
            call_to_actions: items.slice(0, 4).map((i) => ({
              question: i.question.slice(0, 80),
              payload: i.payload.slice(0, 1000),
            })),
          },
        ],
      }
    : null;
  const r = body
    ? await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    : await fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: ["ice_breakers"] }) });
  if (!r.ok) throw new Error("ice breakers " + platform + ": " + (await r.text()).slice(0, 300));
}

// Private Reply oficial de Meta: manda un DM al autor de un comentario
// (válido hasta 7 días después del comentario; funciona en IG y FB)
export async function sendPrivateReply(commentId: string, text: string): Promise<void> {
  const token = await pageToken();
  const r = await fetch(`${GRAPH}/${PAGE_ID}/messages?access_token=${encodeURIComponent(token)}`, {
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
  const token = await pageToken();
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
  const token = await pageToken();
  const r = await fetch(`${GRAPH}/${commentId}/likes?access_token=${encodeURIComponent(token)}`, { method: "POST" });
  if (!r.ok) throw new Error("like comment: " + (await r.text()).slice(0, 300));
}

// Oculta / muestra un comentario (IG usa "hide", FB usa "is_hidden")
export async function hideComment(commentId: string, platform: "instagram" | "facebook", hide: boolean): Promise<void> {
  const token = await pageToken();
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
  if (!senderId || !fbConfigured()) return "";
  let token = "";
  try {
    token = await pageToken();
  } catch {
    return "";
  }
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
