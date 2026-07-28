import crypto from "crypto";
import { addMetaEvent } from "@/lib/meta";
import { addLead, upsertLeadByContact } from "@/lib/leads";
import { anovaReply, anovaVision, typeReply } from "@/lib/anova";
import { waConfigured, sendWhatsAppText, fetchMediaBase64 } from "@/lib/whatsapp";
import { fbConfigured, sendMetaDM, fetchMetaName, fetchUrlBase64 } from "@/lib/meta-send";
import { addComment } from "@/lib/comments";

// Ids propios (página FB e IG del estudio): sus comentarios/respuestas no se registran (anti-bucle)
const OWN_IDS = new Set(["797899886739979", "17841466188660965"]);
import { getSettings } from "@/lib/settings";
import { addConvoMsg } from "@/lib/convos";
import { pushAll } from "@/lib/push";
import { notifyStudio } from "@/lib/notify";

const ABONO_RE = /(abono|comprobante|consign|transferencia|transferí|nequi|daviplata|pag(u?é|ado|o\s+ya))/i;
const CONFIRM_RE = /^(confirmo|s[ií],?\s*(confirmo|asistir[eé]|voy|all[ií]\s+estar[eé])|all[ií]\s+estar[eé])/i;

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
interface MetaAttachment {
  type?: string;
  payload?: { url?: string; sticker_id?: number; title?: string; coordinates?: { lat?: number; long?: number } };
}
interface Messaging {
  sender?: { id?: string };
  message?: { text?: string; is_echo?: boolean; attachments?: MetaAttachment[] };
  postback?: { title?: string };
}
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
  | (Record<string, unknown> & { waType?: string; mediaId?: string; caption?: string; texto?: string; kind?: "dm" | "comment" })
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

  // DM (Instagram / Messenger): texto, adjuntos (foto, sticker, audio, video,
  // archivo, ubicación, compartidos, menciones en historias) o postback de botón.
  // Los ecos de lo que enviamos nosotros se ignoran.
  const dm = entry.messaging?.[0];
  if (dm && !dm.message?.is_echo && (dm.message?.text || dm.message?.attachments?.length || dm.postback?.title)) {
    const d = describeMeta(dm);
    return {
      nombre: plat + " (DM)", contacto: dm.sender?.id || "", servicio: plat + " · DM",
      idea: d.label, origen: object, kind: "dm", waType: d.type, texto: d.texto, metaImg: d.img,
    };
  }

  // Comentario (Instagram comments / Facebook feed)
  const ch = entry.changes?.[0];
  if (ch && (ch.field === "comments" || ch.field === "feed")) {
    const v = ch.value || {};
    if (ch.field === "feed" && v.item && v.item !== "comment") return null; // solo comentarios
    const from = v.from as { name?: string; username?: string; id?: string } | undefined;
    if (from?.id && OWN_IDS.has(from.id)) return null; // nuestras propias respuestas no cuentan
    const text = (v.text as string) || (v.message as string) || "[comentario]";
    const commentId = (v.comment_id as string) || ((v.id && ch.field === "comments" ? v.id : "") as string);
    const postId = ((v.media as { id?: string })?.id || v.post_id || "") as string;
    return {
      nombre: from?.name || from?.username || plat + " (comentario)", contacto: from?.id || from?.username || "",
      servicio: "Comentario " + plat, idea: text, origen: object, kind: "comment", commentId, postId,
    };
  }

  return null;
}

// Identifica el tipo de mensaje de Instagram/Messenger (equivalente a describeWa)
function describeMeta(dm: Messaging): { label: string; type: string; img?: string; texto?: string } {
  const texto = dm.message?.text || dm.postback?.title || "";
  const labels: string[] = [];
  let img: string | undefined;
  let type = "text";
  for (const a of dm.message?.attachments || []) {
    const t = a.type || "";
    if (t === "image") {
      if (a.payload?.sticker_id) { labels.push("😄 Sticker"); type = "sticker"; }
      else { labels.push("📷 Imagen"); if (!img && a.payload?.url) img = a.payload.url; type = "image"; }
    } else if (t === "video" || t === "ig_reel" || t === "reel") { labels.push("🎬 Video"); type = "video"; }
    else if (t === "audio") { labels.push("🎤 Nota de voz"); type = "audio"; }
    else if (t === "file") { labels.push("📄 Archivo"); type = "document"; }
    else if (t === "location") {
      const c = a.payload?.coordinates;
      labels.push("📍 Ubicación" + (c?.lat != null ? ` (${c.lat}, ${c.long})` : ""));
      type = "location";
    } else if (t === "share" || t === "template" || t === "fallback") {
      labels.push("🔗 Compartió" + (a.payload?.title ? ": " + a.payload.title : " una publicación"));
      type = "share";
    } else if (t === "story_mention") { labels.push("📣 Te mencionó en su historia"); type = "story_mention"; }
    else if (t === "like_heart") { labels.push("Reaccionó ❤️"); type = "reaction"; }
    else { labels.push("[" + t + "]"); type = type === "text" ? t : type; }
  }
  if (texto) type = "text"; // si escribió texto, Ana responde al texto (el adjunto queda etiquetado)
  const label = [texto, ...labels].filter(Boolean).join(" · ") || "[mensaje]";
  return { label, type, img, texto };
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

        // Avisos IMPORTANTES al WhatsApp del estudio: abonos y confirmaciones de cita
        const texto = String(lead.texto ?? lead.idea ?? "");
        if (lead.waType === "image" && ABONO_RE.test(String(lead.caption || ""))) {
          notifyStudio(`💰 POSIBLE COMPROBANTE DE ABONO\n${lead.nombre}\n📱 ${lead.contacto}\n“${lead.caption}” (envió imagen)`).catch(() => {});
        } else if (ABONO_RE.test(texto)) {
          notifyStudio(`💰 POSIBLE ABONO / PAGO\n${lead.nombre}\n📱 ${lead.contacto}\n“${texto.slice(0, 200)}”`).catch(() => {});
        } else if (CONFIRM_RE.test(texto)) {
          notifyStudio(`✅ CONFIRMÓ ASISTENCIA\n${lead.nombre}\n📱 ${lead.contacto}\n“${texto.slice(0, 120)}”`).catch(() => {});
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
      } else if (lead.kind === "dm" && lead.contacto) {
        // DM de Instagram o Messenger: chat en el inbox + push + respuesta de Ana
        const canal = lead.origen === "instagram" ? "instagram" as const : "facebook" as const;
        const nombre = (await fetchMetaName(String(lead.contacto)).catch(() => "")) || String(lead.nombre || "");
        lead.nombre = nombre;
        await upsertLeadByContact(lead);
        const imgUrl = typeof lead.metaImg === "string" && lead.metaImg.startsWith("http") ? lead.metaImg : undefined;
        await addConvoMsg(String(lead.contacto), nombre, "coleccionista", String(lead.idea || ""), imgUrl, canal);
        if (lead.waType !== "reaction") {
          pushAll("💬 " + (nombre || (canal === "instagram" ? "Instagram" : "Messenger")), String(lead.idea || "Nuevo mensaje"), "/os").catch(() => {});
        }

        const cfg = await getSettings();
        if (fbConfigured() && cfg.anovaAuto && process.env.ANOVA_AUTO !== "off") {
          try {
            const type = String(lead.waType || "text");
            let reply: string | null = null;
            if (type === "reaction") reply = null; // a una reacción no se responde
            else if (type === "image" && imgUrl) {
              const media = await fetchUrlBase64(imgUrl);
              reply = media && media.mime.startsWith("image/")
                ? (await anovaVision(media.b64, media.mime, String(lead.texto || ""), nombre)) || typeReply("image")
                : typeReply("image");
            } else if (type !== "text") reply = typeReply(type) || typeReply("sticker");
            else reply = (await anovaReply(String(lead.texto ?? lead.idea ?? ""), nombre)).reply;

            if (reply) {
              await sendMetaDM(String(lead.contacto), reply);
              await addConvoMsg(String(lead.contacto), "", "ana", reply, undefined, canal);
            }
          } catch {
            /* si falla el envío no rompemos la recepción */
          }
        }
      } else if (lead.kind === "comment") {
        // Comentario de IG/FB: va a la bandeja Comentarios del inbox (no al CRM de leads)
        const plataforma = lead.origen === "instagram" ? "instagram" as const : "facebook" as const;
        await addComment({
          id: String(lead.commentId || "c" + Date.now()),
          platform: plataforma,
          from: String(lead.nombre || ""),
          fromId: String(lead.contacto || ""),
          text: String(lead.idea || ""),
          at: new Date().toISOString(),
          postId: String(lead.postId || "") || undefined,
        });
        pushAll(
          "💬 Comentario en " + (plataforma === "instagram" ? "Instagram" : "Facebook"),
          `${lead.nombre}: ${String(lead.idea || "")}`.slice(0, 160),
          "/os",
        ).catch(() => {});
      } else {
        await addLead(lead);
      }
    }
  } catch {
    /* nunca fallar el 200: Meta reintenta si no respondemos rápido */
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
