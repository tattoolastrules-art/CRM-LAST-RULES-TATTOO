import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getConvos, addConvoMsg, markConvoRead, checkWindowAlerts } from "@/lib/convos";
import { sendWhatsAppText, sendWhatsAppImage, uploadWhatsAppMedia, waConfigured, sendWhatsAppTemplate } from "@/lib/whatsapp";
import { sendMetaDM } from "@/lib/meta-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSession() {
  const c = await cookies();
  return verifySession(c.get("lr_session")?.value);
}

export async function GET() {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  // el polling del inbox también dispara la revisión de ventanas de 24h (avisa 1 sola vez)
  await checkWindowAlerts().catch(() => {});
  return Response.json({ convos: await getConvos(), waReady: waConfigured() });
}

export async function POST(req: Request) {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });

  const ct = req.headers.get("content-type") || "";

  // Envío de imagen (multipart)
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const contacto = String(form.get("contacto") || "");
    const caption = String(form.get("caption") || "");
    const thumb = String(form.get("thumb") || "");
    if (!file || !contacto) return Response.json({ error: "faltan datos" }, { status: 400 });
    try {
      const canal = (await getConvos()).find((c) => c.id === contacto)?.canal || "whatsapp";
      if (canal !== "whatsapp") return Response.json({ error: "por ahora las fotos solo se envían por WhatsApp" }, { status: 400 });
      const buf = Buffer.from(await file.arrayBuffer());
      const mediaId = await uploadWhatsAppMedia(buf, file.type || "image/jpeg");
      await sendWhatsAppImage(contacto, mediaId, caption || undefined);
      await addConvoMsg(contacto, "", "equipo", caption || "", thumb.startsWith("data:image/") ? thumb : undefined);
      return Response.json({ ok: true, convos: await getConvos() });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }
  }

  const b = await req.json();
  if (b.action === "send" && b.contacto && b.text) {
    try {
      const canal = (await getConvos()).find((c) => c.id === String(b.contacto))?.canal || "whatsapp";
      if (canal === "whatsapp") await sendWhatsAppText(String(b.contacto), String(b.text));
      else await sendMetaDM(String(b.contacto), String(b.text));
      await addConvoMsg(String(b.contacto), "", "equipo", String(b.text), undefined, canal);
      return Response.json({ ok: true, convos: await getConvos() });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }
  }
  // Envío de PLANTILLA aprobada (única forma de escribir con la ventana de 24h cerrada)
  if (b.action === "template" && b.contacto && b.template) {
    try {
      const convo = (await getConvos()).find((c) => c.id === String(b.contacto));
      if ((convo?.canal || "whatsapp") !== "whatsapp") {
        return Response.json({ error: "las plantillas solo existen en WhatsApp" }, { status: 400 });
      }
      const nombre = (convo?.nombre || "").split(" ")[0] || "🖤";
      const texto = String(b.texto || "").replace(/\s+/g, " ").trim();
      let params: string[];
      let textoChat: string;
      if (b.template === "lr_seguimiento") {
        if (!texto) return Response.json({ error: "escribe el mensaje" }, { status: 400 });
        params = [nombre, texto.slice(0, 400)];
        textoChat = `¡Hola ${nombre}! Te escribo de Last Rules Tattoo 🖤 ${texto} Cualquier duda me escribes por aquí.`;
      } else if (b.template === "lr_confirmacion_cita") {
        if (!texto) return Response.json({ error: "escribe la fecha de la cita" }, { status: 400 });
        params = [nombre, texto.slice(0, 200)];
        textoChat = `¡Hola ${nombre}! Te escribo de Last Rules Tattoo 🖤 Tienes tu cita ${texto}. Llega con buena comida, bien hidratado(a) y ropa cómoda. ¿Nos confirmas que asistes?`;
      } else {
        return Response.json({ error: "plantilla desconocida" }, { status: 400 });
      }
      await sendWhatsAppTemplate(String(b.contacto), String(b.template), params);
      await addConvoMsg(String(b.contacto), "", "equipo", textoChat);
      return Response.json({ ok: true, convos: await getConvos() });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 500 });
    }
  }
  if (b.action === "read" && b.id) {
    await markConvoRead(String(b.id));
    return Response.json({ ok: true });
  }
  return Response.json({ error: "acción inválida" }, { status: 400 });
}
