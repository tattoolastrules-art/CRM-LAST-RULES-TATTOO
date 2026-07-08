import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getConvos, addConvoMsg, markConvoRead } from "@/lib/convos";
import { sendWhatsAppText, sendWhatsAppImage, uploadWhatsAppMedia, waConfigured } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSession() {
  const c = await cookies();
  return verifySession(c.get("lr_session")?.value);
}

export async function GET() {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
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
      await sendWhatsAppText(String(b.contacto), String(b.text));
      await addConvoMsg(String(b.contacto), "", "equipo", String(b.text));
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
