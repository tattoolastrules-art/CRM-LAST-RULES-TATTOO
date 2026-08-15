import crypto from "crypto";
import { addMetaEvent } from "@/lib/meta";
import { addLead, upsertLeadByContact } from "@/lib/leads";
import { anovaReply, anovaVision, typeReply, isGreeting, type ChatTurn } from "@/lib/anova";
import { waConfigured, sendWhatsAppText, sendWhatsAppButtons, fetchMediaBase64 } from "@/lib/whatsapp";
import { getIceBreakers, findIceBreakerAnswer, ibPayload } from "@/lib/ice-breakers";
import { fbConfigured, sendMetaDM, fetchMetaName, fetchUrlBase64, replyComment, sendPrivateReply } from "@/lib/meta-send";
import { addComment, patchComment } from "@/lib/comments";
import { saveJSON } from "@/lib/store";

// Última falla del auto-respondedor (para diagnóstico: clave debug_last en Neon)
function logFail(donde: string, e: unknown) {
  saveJSON("debug_last", { at: new Date().toISOString(), donde, err: String((e as Error)?.message || e).slice(0, 400) }).catch(() => {});
}

// Ids propios (página FB e IG del estudio): sus comentarios/respuestas no se registran (anti-bucle)
const OWN_IDS = new Set(["797899886739979", "17841466188660965"]);
import { getSettings, saveSettings } from "@/lib/settings";
import { addConvoMsg, getConvos } from "@/lib/convos";
import { pushAll } from "@/lib/push";
import { notifyStudio } from "@/lib/notify";

const ABONO_RE = /(abono|comprobante|consign|transferencia|transferí|nequi|daviplata|pag(u?é|ado|o\s+ya))/i;
const CONFIRM_RE = /^(confirmo|s[ií],?\s*(confirmo|asistir[eé]|voy|all[ií]\s+estar[eé])|all[ií]\s+estar[eé])/i;

// Comentario con intención de compra → además de responder público, se le envía DM
const INTENT_RE = /(precio|cu[aá]nto|vale|cotiz|info|agendar|agenda|cita|turno|disponib|quiero uno|quiero un|me interesa|c[oó]mo hago|d[oó]nde (est[aá]n|queda)|ubicaci[oó]n|horario|domicilio|inbox|dm)/i;

// Respuestas públicas rotativas (predefinidas: cero tokens)
const PUB_GRACIAS = [
  "🖤🖤",
  "¡Gracias! 🖤",
  "¡Mil gracias! Aquí te esperamos 🖤",
  "Se viene más ✨🖤",
];
const PUB_INTERES = [
  "¡Hola! Te escribimos por DM 🖤 revisa tus mensajes",
  "Te mandamos la info por interno 🖤",
  "¡Claro que sí! Te escribimos al DM 🖤",
];
// OJO: sin prometer precios — Ana no cotiza (regla dura del estudio)
const DM_COMENTARIO = [
  "¡Hola! Vimos tu comentario 🖤 Soy Ana, del estudio Last Rules. Cuéntame: ¿qué tatuaje tienes en mente? Te explico cómo funciona la cotización a tu medida y te paso agenda sin compromiso.",
  "¡Hola! Soy Ana, de Last Rules Tattoo 🖤 Vi tu comentario y te escribo de una. ¿Qué idea tienes? Un tatuador te la cotiza a la medida y yo te cuento disponibilidad ✨",
];
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// ── Modo administrador por WhatsApp ──
// El código activa el rol: ese número recibe los avisos del estudio y Ana lo
// atiende SOLO con respuestas predefinidas (cero tokens) indicando rutas del panel.
const ADMIN_CODE = "28072026";
const ADMIN_ASK_RE = /(administrador|admin\b|activar.*notificaci|notificaci.*activar|notificaciones directas)/i;

function adminRoute(t: string): string {
  const BASE = "https://app.lastrulestattoo.com/os";
  const r = (ruta: string, tip: string) => `🖤 Modo administrador\n${tip}\n👉 ${ruta}`;
  const s = (t || "").toLowerCase();
  if (/notificacion|aviso/.test(s)) return r(`${BASE} → Agenda → Seguimientos`, "Las notificaciones del estudio llegan al “Número de avisos” de esa pantalla (ya quedó este). El push por dispositivo se activa con el botón “Avisos” del menú del panel.");
  if (/plantilla/.test(s)) return r(`${BASE} → Omnicanal → botón 📄 dentro del chat`, "Las plantillas reabren chats de WhatsApp cuando la ventana de 24h ya se cerró.");
  if (/cita|agenda|calendario/.test(s)) return r(`${BASE} → Agenda`, "Citas de los tatuadores con “+ Nueva cita” (tatuador, estilo, fecha; se sincroniza con Google Calendar).");
  if (/chat|mensaje|whatsapp|instagram|face|comentario|inbox/.test(s)) return r(`${BASE} → Omnicanal`, "Todos los chats (WhatsApp, Instagram, Messenger) y la pestaña Comentarios para responder, dar like u ocultar.");
  if (/lead|reserva|cliente|crm|embudo/.test(s)) return r(`${BASE} → CRM y Reservas`, "Los clientes, las reservas de la web y el embudo con sus estados.");
  if (/flujo/.test(s)) return r(`${BASE} → Flujos`, "Los mensajes automáticos de Ana: tocas un nodo verde y editas el texto directamente.");
  if (/planner|marketing|campañ|publicacion|contenido/.test(s)) return r(`${BASE} → Planner`, "Tablero y calendario de marketing: creas campañas y las mueves por estado o por fecha.");
  if (/web|sitio|pagina|foto|portafolio|noticia/.test(s)) return r(`${BASE} → Sitio`, "La página pública: tatuadores, portafolio y noticias. “Publicar al sitio” sube los cambios a la web.");
  if (/seguimiento|encuesta|confirmaci/.test(s)) return r(`${BASE} → Agenda → Seguimientos`, "Confirmación de citas y controles post-tatuaje (los días y textos son editables) + encuesta con reseña de Google.");
  if (/usuario|clave|contraseñ/.test(s)) return r(`${BASE} → Usuarios`, "Crear usuarios del equipo y asignar claves y roles.");
  return `🖤 Modo administrador — te guío directo, sin gastar IA.\nDime una palabra clave y te paso la ruta exacta: citas · chats · comentarios · reservas · flujos · planner · sitio · plantillas · notificaciones · seguimientos · usuarios.\n👉 Panel: ${BASE}`;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Ana necesita más de los 10s por defecto (Claude + envío)

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
  interactive?: { button_reply?: { id?: string; title?: string }; list_reply?: { id?: string; title?: string } };
}
interface MetaAttachment {
  type?: string;
  payload?: { url?: string; sticker_id?: number; title?: string; coordinates?: { lat?: number; long?: number } };
}
interface Messaging {
  sender?: { id?: string };
  message?: { text?: string; is_echo?: boolean; attachments?: MetaAttachment[] };
  postback?: { title?: string; payload?: string };
}
interface Change { field?: string; value?: Record<string, unknown> }
interface Entry { changes?: Change[]; messaging?: Messaging[] }

// Firma de cada entrega (X-Hub-Signature-256 = HMAC-SHA256 del body con el app
// secret). Sin META_APP_SECRET configurado no se puede verificar y se acepta
// (compatibilidad); con el secreto puesto, todo body sin firma válida se rechaza
// — evita que un tercero inyecte mensajes falsos o fuerce el código de admin.
function firmaValida(raw: string, sig: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true;
  if (!sig || !sig.startsWith("sha256=")) return false;
  const esperado = crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(esperado, "hex");
  const b = Buffer.from(sig.slice(7), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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
function describeWa(m: WaMessage): { label: string; waType: string; mediaId?: string; caption?: string; texto?: string; ibId?: string } {
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
      const ibId = m.interactive?.button_reply?.id || m.interactive?.list_reply?.id;
      return { label: title, waType: "text", texto: title, ibId };
    }
    default:
      return { label: "[" + t + "]", waType: t };
  }
}

type Lead = Record<string, unknown> & {
  waType?: string; mediaId?: string; caption?: string; texto?: string; ibId?: string; kind?: "dm" | "comment";
};

// De un evento de Meta saca los leads (WhatsApp / Instagram / Facebook).
// Meta AGRUPA notificaciones (varios changes/messages/messaging por entry, p. ej.
// tras reintentos o cuando el cliente escribe seguido): se procesan TODOS.
function extractLeads(object: string, entry: Entry | null): Lead[] {
  if (!entry) return [];
  const out: Lead[] = [];

  // WhatsApp: mensajes entrantes (cualquier tipo)
  if (object === "whatsapp_business_account") {
    for (const ch of entry.changes || []) {
      const value = ch?.value as
        | { messages?: WaMessage[]; contacts?: { profile?: { name?: string } }[] }
        | undefined;
      for (const m of value?.messages || []) {
        if (!m?.from) continue;
        const d = describeWa(m);
        out.push({
          nombre: value?.contacts?.[0]?.profile?.name || m.from,
          contacto: m.from,
          servicio: "WhatsApp",
          idea: d.label || "[mensaje]",
          origen: "whatsapp",
          waType: d.waType,
          mediaId: d.mediaId,
          caption: d.caption,
          texto: d.texto,
          ibId: d.ibId,
        });
      }
    }
    return out;
  }

  const plat = object === "instagram" ? "Instagram" : "Facebook";

  // DM (Instagram / Messenger): texto, adjuntos (foto, sticker, audio, video,
  // archivo, ubicación, compartidos, menciones en historias) o postback de botón.
  // Los ecos de lo que enviamos nosotros se ignoran.
  for (const dm of entry.messaging || []) {
    if (dm && !dm.message?.is_echo && (dm.message?.text || dm.message?.attachments?.length || dm.postback?.title)) {
      const d = describeMeta(dm);
      out.push({
        nombre: plat + " (DM)", contacto: dm.sender?.id || "", servicio: plat + " · DM",
        idea: d.label, origen: object, kind: "dm", waType: d.type, texto: d.texto, metaImg: d.img,
        ibId: dm.postback?.payload,
      });
    }
  }

  // Comentarios (Instagram comments / Facebook feed)
  for (const ch of entry.changes || []) {
    if (!ch || (ch.field !== "comments" && ch.field !== "feed")) continue;
    const v = ch.value || {};
    if (ch.field === "feed" && v.item && v.item !== "comment") continue; // solo comentarios
    const from = v.from as { name?: string; username?: string; id?: string } | undefined;
    if (from?.id && OWN_IDS.has(from.id)) continue; // nuestras propias respuestas no cuentan
    const text = (v.text as string) || (v.message as string) || "[comentario]";
    const commentId = (v.comment_id as string) || ((v.id && ch.field === "comments" ? v.id : "") as string);
    const postId = ((v.media as { id?: string })?.id || v.post_id || "") as string;
    out.push({
      nombre: from?.name || from?.username || plat + " (comentario)", contacto: from?.id || from?.username || "",
      servicio: "Comentario " + plat, idea: text, origen: object, kind: "comment", commentId, postId,
    });
  }

  return out;
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
  history?: ChatTurn[],
  canal?: "whatsapp" | "instagram" | "facebook",
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

  const { reply } = await anovaReply(String(lead.texto ?? lead.idea ?? ""), String(lead.nombre || ""), history, canal);
  return reply;
}

// Historial reciente del chat (para que Ana recuerde lo ya hablado y no repita preguntas)
async function chatHistory(contacto: string): Promise<ChatTurn[]> {
  const convo = (await getConvos().catch(() => [])).find((c) => c.id === contacto);
  if (!convo) return [];
  return convo.messages
    .filter((m) => m.text)
    .slice(-12)
    .map((m) => ({
      role: m.sender === "coleccionista" ? ("user" as const) : ("assistant" as const),
      content: m.text,
    }));
}

// Recepción de eventos
export async function POST(req: Request) {
  const raw = await req.text();
  if (!firmaValida(raw, req.headers.get("x-hub-signature-256"))) {
    logFail("firma", "X-Hub-Signature-256 inválida o ausente");
    return new Response("Invalid signature", { status: 401 });
  }
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

    // Puede venir más de un entry y más de un mensaje por entry (agrupados)
    const entries = Array.isArray(body.entry) ? (body.entry as Entry[]) : [];
    for (const en of entries) {
      for (const lead of extractLeads(object, en)) {
        await procesarLead(lead);
      }
    }
  } catch {
    /* nunca fallar el 200: Meta reintenta si no respondemos rápido */
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}

// Procesa UN lead/mensaje (el POST puede traer varios agrupados)
async function procesarLead(lead: Lead): Promise<void> {
  {
    {
      if (lead.origen === "whatsapp") {
        // ── Modo administrador (código 280… → rutas del panel, cero tokens) ──
        const from = String(lead.contacto);
        const waTexto = String(lead.texto ?? "").trim();
        const cfg0 = await getSettings();
        const responderAdmin = async (msg: string) => {
          await addConvoMsg(from, String(lead.nombre || ""), "coleccionista", String(lead.idea || ""));
          try {
            if (waConfigured()) {
              await sendWhatsAppText(from, msg);
              await addConvoMsg(from, "", "ana", msg);
            }
          } catch { /* sin ventana o sin config: no rompemos la recepción */ }
        };
        if (waTexto === ADMIN_CODE) {
          await saveSettings({ notifyPhone: from, adminPhones: [...new Set([...cfg0.adminPhones, from])] });
          await responderAdmin(
            "✅ Código correcto. Este número quedó como ADMINISTRADOR del sistema:\n• Aquí llegarán los avisos del estudio (reservas web, citas, posibles abonos, chats por vencerse).\n• Escríbeme una palabra (citas, chats, sitio…) y te paso la ruta exacta del panel.\n\n👉 Panel: https://app.lastrulestattoo.com/os",
          );
          return;
        }
        if (cfg0.adminPhones.includes(from)) {
          await responderAdmin(adminRoute(waTexto));
          return;
        }
        if (ADMIN_ASK_RE.test(waTexto)) {
          await responderAdmin("¡Hola! Claro 🖤 Por seguridad, envíame el código de administrador (solo el número) y activo todo con este WhatsApp.");
          return;
        }

        // ¿Es un contacto nuevo? (antes de registrar su mensaje) → bienvenida con botones
        const esNuevo = !(await getConvos().catch(() => [])).some((c) => c.id === from);

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
            const ibCfg = await getIceBreakers();
            const ib = findIceBreakerAnswer(ibCfg, String(lead.ibId || ""), texto);
            if (ib) {
              // Tocó un botón de plantilla → respuesta predefinida (cero tokens)
              await sendWhatsAppText(from, ib);
              await addConvoMsg(from, "", "ana", ib);
            } else if (esNuevo && (lead.waType || "text") === "text" && isGreeting(texto) && ibCfg.whatsapp.length) {
              // Contacto nuevo que saluda → bienvenida con las plantillas listas (botones)
              const botones = ibCfg.whatsapp.map((x, i) => ({ id: ibPayload("whatsapp", i), title: x.q }));
              await sendWhatsAppButtons(from, ibCfg.waWelcome, botones);
              await addConvoMsg(from, "", "ana", ibCfg.waWelcome + "\n" + botones.map((b) => "▢ " + b.title).join("\n"));
            } else {
              const reply = await replyFor(lead, media, await chatHistory(from), "whatsapp");
              if (reply) {
                await sendWhatsAppText(from, reply);
                await addConvoMsg(from, "", "ana", reply);
              }
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
            const ibCfg = await getIceBreakers();
            const ib = findIceBreakerAnswer(ibCfg, String(lead.ibId || ""), String(lead.texto || ""));
            let reply: string | null = null;
            if (ib) reply = ib; // tocó una pregunta de plantilla → respuesta predefinida (cero tokens)
            else if (type === "reaction") reply = null; // a una reacción no se responde
            else if (type === "image" && imgUrl) {
              const media = await fetchUrlBase64(imgUrl);
              reply = media && media.mime.startsWith("image/")
                ? (await anovaVision(media.b64, media.mime, String(lead.texto || ""), nombre)) || typeReply("image")
                : typeReply("image");
            } else if (type !== "text") reply = typeReply(type) || typeReply("sticker");
            else reply = (await anovaReply(String(lead.texto ?? lead.idea ?? ""), nombre, await chatHistory(String(lead.contacto)), canal)).reply;

            if (reply) {
              await sendMetaDM(String(lead.contacto), reply);
              await addConvoMsg(String(lead.contacto), "", "ana", reply, undefined, canal);
            } else {
              logFail("dm-" + canal, "reply null (tipo " + String(lead.waType) + ")");
            }
          } catch (e) {
            logFail("dm-" + canal, e); // si falla el envío no rompemos la recepción
          }
        }
      } else if (lead.kind === "comment") {
        // Comentario de IG/FB: va a la bandeja Comentarios del inbox (no al CRM de leads)
        const plataforma = lead.origen === "instagram" ? "instagram" as const : "facebook" as const;
        const commentId = String(lead.commentId || "c" + Date.now());
        const texto = String(lead.idea || "");
        // Tarjeta única por cliente: el comentario se une al MISMO lead que sus DMs
        // (Meta usa el mismo id de usuario en comentarios y mensajes del canal)
        if (lead.contacto) {
          await upsertLeadByContact({
            nombre: lead.nombre, contacto: lead.contacto,
            servicio: "Comentario " + (plataforma === "instagram" ? "Instagram" : "Facebook"),
            idea: texto, origen: lead.origen,
          }).catch(() => {});
        }
        const esNuevo = await addComment({
          id: commentId,
          platform: plataforma,
          from: String(lead.nombre || ""),
          fromId: String(lead.contacto || ""),
          text: texto,
          at: new Date().toISOString(),
          postId: String(lead.postId || "") || undefined,
        });

        // Auto-respuesta (mismo interruptor NOVA): pública siempre, DM si hay intención de compra.
        // Predefinidas rotativas = cero tokens; la IA entra cuando el cliente responda el DM.
        let extra = "";
        const cfg = await getSettings();
        if (esNuevo && lead.commentId && fbConfigured() && cfg.anovaAuto && process.env.ANOVA_AUTO !== "off") {
          const conIntencion = INTENT_RE.test(texto);
          try {
            const pub = pick(conIntencion ? PUB_INTERES : PUB_GRACIAS);
            await replyComment(commentId, plataforma, pub);
            await patchComment(commentId, { replied: { text: pub, at: new Date().toISOString() } });
            extra = " · Ana respondió";
          } catch (e) { logFail("comment-reply", e); /* sin permiso o comentario borrado: queda manual */ }
          if (conIntencion) {
            try {
              await sendPrivateReply(commentId, pick(DM_COMENTARIO));
              await patchComment(commentId, { dmSent: true });
              extra += " + DM enviado";
            } catch (e) { logFail("comment-dm", e); /* fuera de la ventana de 7 días o DMs cerrados */ }
          }
        }

        pushAll(
          "💬 Comentario en " + (plataforma === "instagram" ? "Instagram" : "Facebook") + extra,
          `${lead.nombre}: ${texto}`.slice(0, 160),
          "/os",
        ).catch(() => {});
      } else {
        await addLead(lead);
      }
    }
  }
}
