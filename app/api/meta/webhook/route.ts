import crypto from "crypto";
import { addMetaEvent } from "@/lib/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Verificación del webhook (Meta hace un GET con hub.challenge)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const mode = u.searchParams.get("hub.mode");
  const token = u.searchParams.get("hub.verify_token");
  const challenge = u.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.META_VERIFY_TOKEN) {
    return new Response(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403 });
}

// Recepción de eventos (Meta postea comentarios / mensajes / reacciones)
export async function POST(req: Request) {
  const raw = await req.text();
  const body = ((): Record<string, unknown> => {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  })();

  try {
    const object = typeof body.object === "string" ? body.object : "desconocido";
    const entry = Array.isArray(body.entry) ? (body.entry[0] as Record<string, unknown>) : null;
    let summary = object;
    if (entry) {
      const changes = Array.isArray(entry.changes) ? (entry.changes[0] as Record<string, unknown>) : null;
      const messaging = Array.isArray(entry.messaging) ? entry.messaging[0] : null;
      if (changes) {
        const value = (changes.value as Record<string, unknown>) || {};
        summary = [object, changes.field, value.item || value.verb].filter(Boolean).join(" · ");
      } else if (messaging) {
        summary = object + " · mensaje";
      }
    }
    await addMetaEvent({ id: crypto.randomBytes(4).toString("hex"), at: new Date().toISOString(), object, summary, raw: body });
  } catch {
    /* nunca fallar el 200: Meta reintenta si no respondemos rápido */
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
