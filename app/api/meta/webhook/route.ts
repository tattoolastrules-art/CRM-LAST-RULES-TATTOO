import crypto from "crypto";
import { addMetaEvent } from "@/lib/meta";
import { addLead, upsertLeadByContact } from "@/lib/leads";
import { anovaReply, anovaVision, typeReply } from "@/lib/anova";
import { waConfigured, sendWhatsAppText, fetchMediaBase64 } from "@/lib/whatsapp";
import { getSettings } from "@/lib/settings";
import { addConvoMsg } from "@/lib/convos";
import { pushAll } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WaMedia { id?: string; caption?: string; mime_type?: string; filename?: string }
interface WaMessage {
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: WaMedia;
  video?: WaMedia;
  audio?: WaMedia;
  sticker?: WaMedia;
  document?: WaMedia;
  location?: { latitude?: number; longitude?: number; name?: string };
  reaction?: { emoji?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
}
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

// Identifica el tipo de mensaje de WhatsApp y arma su descripción para el CRM
function describeWa(m: WaMessage): { label: string; waType: string; mediaId?: string; caption?: string; texto?: string } {
  const t = m.type || "text";
  switch (t) {
    case "text":
      return { label: m.text?.body || "", waType: "text", texto: m.text?.body || "" };
    case "image":
      return { label: "📷 Imagen" + (m.image?.caption ? " — " + m.image.caption : ""), waType: "image", mediaId: m.image?.id, caption: m.image?.caption || "" };
    case "video":
      return { label: "🎬 Video" + (m.video?.caption ? " — " + m.video.caption : ""), waType: "video" };
    case "audio":
      return { label: "🎤 Nota de voz", waType: "audio" };
    case "sticker":
      return { label: "😄 Sticker", waType: "sticker" };
    case "document":
      return { label: "📄 " + (m.document?.filename || "Documento") + (m.document?.caption ? " — " + m.document.caption : ""), waType: "document" };
    case "location":
      return { label: "📍 Ubicación" + (m.location?.name ? ": " + m.location.name : ""), waType: "location" };
    case "contacts":
      return { label: "👤 Contacto compartido", waType: "contacts" };
    case "reaction":
      return { label: "Reaccionó " + (m.reaction?.emoji || "👍"), waType: "reaction" };
    case "button":
      return { label: m.button?.text || "[botón]", waType: "text", texto: m.button?.text || "" };
    case "interactive": {
      const title = m.interactive?.button_reply?.title || m.interactive?.list_reply?.title || "[interacción]";
      return { label: title, waType: "text", texto: title };
    }
    default:
      return { label: "[" + t + "]", waType: t };
  }
}

// De un evento de Meta saca un lead (WhatsApp / Instagram / Facebook)
function extractLead(object: string, entry: Entry | null):
  | (Record<string, unknown> & { waType?: string; mediaId?: string; caption?: string; texto?: string })
  | null {
  if (!entry) return null;

  // WhatsApp: mensaje entrante (cualquier tipo)
  if (object === "whatsapp_business_account") {
    const value = entry.changes?.[0]?.value as
      | { messages?: WaMessage[]; contacts?: { profile?: { name?: string } }[] }
      | undefined;
    const m = value?.messages?.[0];
    if (m && m.from) {
      const d = describeWa(m);
      return {
        nombre: value?.contacts?.[0]?.profile?.name || m.from,
        contacto: m.from,
        servicio: "WhatsApp",
        idea: d.label || "[mensaje]",
        origen: "whatsapp",
        waType: d.waType,
        mediaId: d.mediaId,
        caption: d.caption,
        texto: d.texto,
      };
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

// Elige la respuesta de Ana según el tipo de mensaje
async function replyFor(
  lead: { waType?: string; mediaId?: string; caption?: string; texto?: string; idea?: unknown; nombre?: unknown },
  media: { b64: string; mime: string } | null,
): Promise<string | null> {
  const type = lead.waType || "text";

  if (type === "reaction") return null; // a una reacción no se responde (queda en el CRM)

  if (type === "image") {
    // Ana MIRA la imagen (visión); si no puede, respuesta predefinida
    if (media && media.mime.startsWith("image/")) {
      const v = await anovaVision(media.b64, media.mime, lead.caption || "", String(lead.nombre || ""));
      if (v) return v;
    }
    return typeReply("image");
  }

  const predef = typeReply(type);
  if (predef) return predef; // sticker, audio, video, documento, ubicación, contacto

  const { reply } = await anovaReply(String(lead.texto ?? lead.idea ?? ""), String(lead.nombre || ""));
  return reply;
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

        // Si mandó imagen: se descarga UNA vez (para verla en el chat y para la visión de Ana)
        let media: { b64: string; mime: string } | null = null;
        if (lead.waType === "image" && lead.mediaId) {
          media = await fetchMediaBase64(String(lead.mediaId)).catch(() => null);
        }
        const imgUrl = media && media.mime.startsWith("image/") && media.b64.length < 280000
          ? `data:${media.mime};base64,${media.b64}`
          : undefined;

        await addConvoMsg(String(lead.contacto), String(lead.nombre || ""), "coleccionista", String(lead.idea || ""), imgUrl);

        // Notificación push al equipo (en los dispositivos con avisos activados)
        if (lead.waType !== "reaction") {
          pushAll("💬 " + String(lead.nombre || "WhatsApp"), String(lead.idea || "Nuevo mensaje"), "/os").catch(() => {});
        }

        // NOVA responde automáticamente (interruptor en el OS: Reservas → NOVA)
        const cfg = await getSettings();
        if (waConfigured() && cfg.anovaAuto && process.env.ANOVA_AUTO !== "off") {
          try {
            const reply = await replyFor(lead, media);
            if (reply) {
              await sendWhatsAppText(String(lead.contacto), reply);
              await addConvoMsg(String(lead.contacto), "", "ana", reply);
            }
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
