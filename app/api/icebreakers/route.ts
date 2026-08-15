// Plantillas de bienvenida por canal (preguntas listas al abrir el chat).
// GET: configuración actual · POST save: guarda · POST publish: además las
// publica en Instagram/Messenger vía la API de Meta.
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getIceBreakers, saveIceBreakers, ibPayload } from "@/lib/ice-breakers";
import { fbConfigured, setIceBreakers } from "@/lib/meta-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await cookies();
  if (!(await verifySession(c.get("lr_session")?.value)))
    return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json({ config: await getIceBreakers(), metaReady: fbConfigured() });
}

export async function POST(req: Request) {
  const c = await cookies();
  const s = await verifySession(c.get("lr_session")?.value);
  if (!s || s.role !== "admin")
    return Response.json({ error: "Solo administradores" }, { status: 403 });

  const b = await req.json();
  const config = await saveIceBreakers(b.config || {});

  if (b.action !== "publish") return Response.json({ config });

  // Publicar en Meta (Instagram y Messenger); WhatsApp no se publica: sus
  // botones los envía Ana en la bienvenida a contactos nuevos.
  if (!fbConfigured()) {
    return Response.json({ config, published: false, error: "Falta FB_PAGE_TOKEN en el entorno (avísale a PRODY-G)." });
  }
  const errores: string[] = [];
  try {
    await setIceBreakers("instagram", config.instagram.map((x, i) => ({ question: x.q, payload: ibPayload("instagram", i) })));
  } catch (e) {
    errores.push("Instagram: " + (e as Error).message);
  }
  try {
    await setIceBreakers("messenger", config.facebook.map((x, i) => ({ question: x.q, payload: ibPayload("facebook", i) })));
  } catch (e) {
    errores.push("Messenger: " + (e as Error).message);
  }
  return Response.json({
    config,
    published: errores.length === 0,
    ...(errores.length ? { error: errores.join(" · ") } : {}),
  });
}
