import crypto from "crypto";
import { addMetaEvent } from "@/lib/meta";
import { addLead, upsertLeadByContact } from "@/lib/leads";
import { anovaReply } from "@/lib/anova";
import { waConfigured, sendWhatsAppText } from "@/lib/whatsapp";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WaMessage { from?: string; type?: string; text?: { body?: string } }
interface Messaging { sender?: { id?: string }; message?: { text?: string } }
interface Change { field?: string; value?: Record<string, unknown> }
interface Entry { changes?: Change[]; messaging?: Messaging[] }

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

// De un evento de Meta saca un lead (WhatsApp / Instagram / Facebook)
function extractLead(object: string, entry: Entry | null): Record<string, unknown> | null {
  if (!entry) return null;

  // WhatsApp: mensaje entrante
  if (object === "whatsapp_business_account") {
    const value = entry.changes?.[0]?.value as
      | { messages?: WaMessage[]; contacts?: { profile?: { name?: string } }[] }
      | undefined;
    const m = value?.messages?.[0];
    if (m?.from) {
      return { nombre: value?.contacts?.[0]?.profile?.name || m.from, contacto: m.from, servicio: "WhatsApp", idea: m.text?.body || "[mensaje]", origen: "whatsapp" };
    }
    return null;
  }

  const plat = object === "instagram" ? "Instagram" : "Facebook";

  // DM (Instagram / Messenger)
  const dm = entry.messaging?.[0];
  if (dm?.message?.text) {
    return { nombre: plat + " (DM)", contacto: dm.sender?.id || "", servicio: plat + " · DM", idea: dm.message.text, origen: object };
  }

  // Comentario (Instagram comments / Facebook feed)
  const ch = entry.changes?.[0];
  if (ch && (ch.field === "comments" || ch.field === "feed")) {
    const v = ch.value || {};
    if (ch.field === "feed" && v.item && v.item !== "comment") return null; // solo comentarios
    const from = v.from as { name?: string; username?: string; id?: string } | undefined;
    const text = (v.text as string) || (v.message as string) || "[comentario]";
    return { nombre: from?.name || from?.username || plat + " (comentario)", contacto: from?.id || from?.username || "", servicio: "Comentario " + plat, idea: text, origen: object };
  }

  return null;
}

// Recepción de eventos
export async function POST(req: Request) {
  const raw = await req.text();
  const body = ((): Record<string, unknown> => {
    try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
  })();

  try {
    const object = typeof body.object === "string" ? body.object : "desconocido";
    const entry = Array.isArray(body.entry) ? (body.entry[0] as Entry) : null;

    const ch = entry?.changes?.[0];
    const summary = ch
      ? [object, ch.field, (ch.value as Record<string, unknown>)?.item || (ch.value as Record<string, unknown>)?.verb].filter(Boolean).join(" · ")
      : entry?.messaging
      ? object + " · mensaje"
      : object;
    await addMetaEvent({ id: crypto.randomBytes(4).toString("hex"), at: new Date().toISOString(), object, summary, raw: body });

    const lead = extractLead(object, entry);
    if (lead) {
      if (lead.origen === "whatsapp") {
        await upsertLeadByContact(lead);
        // ANOVA responde automáticamente (interruptor en el OS: Reservas → ANOVA)
        const cfg = await getSettings();
        if (waConfigured() && cfg.anovaAuto && process.env.ANOVA_AUTO !== "off") {
          try {
            const { reply } = await anovaReply(String(lead.idea || ""), String(lead.nombre || ""));
            await sendWhatsAppText(String(lead.contacto), reply);
          } catch {
            /* si falla el envío no rompemos la recepción */
          }
        }
      } else {
        await addLead(lead);
      }
    }
  } catch {
    /* nunca fallar el 200: Meta reintenta si no respondemos rápido */
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
