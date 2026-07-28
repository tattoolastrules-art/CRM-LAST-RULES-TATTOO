import crypto from "crypto";
import { loadJSON, saveJSON } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook de TikTok (Business API): recibe eventos de comentarios y (a futuro)
// mensajes. Por ahora registra todo en Neon (clave "tiktok_events") para
// cablear el flujo cuando la app de TikTok esté aprobada.

interface TkEvent { id: string; at: string; raw: unknown }

// TikTok valida el endpoint con un GET (echo del challenge si lo envía)
export async function GET(req: Request) {
  const u = new URL(req.url);
  const challenge = u.searchParams.get("challenge") || u.searchParams.get("hub.challenge");
  if (challenge) return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  return Response.json({ ok: true, service: "LAST RULES OS · TikTok webhook" });
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const body = ((): unknown => { try { return JSON.parse(raw); } catch { return { texto: raw.slice(0, 1000) }; } })();
    const events = await loadJSON<TkEvent[]>("tiktok_events", []);
    events.unshift({ id: crypto.randomBytes(4).toString("hex"), at: new Date().toISOString(), raw: body });
    await saveJSON("tiktok_events", events.slice(0, 100));
  } catch {
    /* nunca fallar: TikTok reintenta */
  }
  return Response.json({ code: 0, message: "success" });
}
