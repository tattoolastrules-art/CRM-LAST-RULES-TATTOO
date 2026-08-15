// "Entrenar IA" de un tatuador: Claude MIRA las fotos de su galería (subidas en
// Sitio → Tatuadores) y destila su perfil de estilo en texto. Ese perfil queda
// guardado en el tatuador (estiloIA) y Ana lo usa para reconocer estilos y
// recomendar al artista ideal — la visión se gasta UNA vez, no en cada chat.
import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getContent, upsert } from "@/lib/content";
import { fetchUrlBase64 } from "@/lib/meta-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // descargar fotos + visión de Claude toma más de 10s

const SITE_BASE = (process.env.SITE_BASE_URL || "https://lastrulestattoo.com").replace(/\/$/, "");

function fotoUrl(rel: string): string {
  if (/^https?:\/\//i.test(rel)) return rel;
  return SITE_BASE + "/" + rel.replace(/^\//, "");
}

export async function POST(req: Request) {
  const c = await cookies();
  const s = await verifySession(c.get("lr_session")?.value);
  if (!s || s.role !== "admin")
    return Response.json({ error: "Solo administradores" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY)
    return Response.json({ error: "Falta ANTHROPIC_API_KEY en el entorno (avísale a PRODY-G)." }, { status: 500 });

  const b = await req.json().catch(() => ({}));
  const id = String(b.id || "");
  const content = await getContent();
  const t = content.tatuadores.find((x) => x.id === id);
  if (!t) return Response.json({ error: "Tatuador no encontrado" }, { status: 404 });

  const fotos = (t.galeria || []).slice(0, 6);
  if (fotos.length < 2)
    return Response.json({ error: "Sube al menos 2 fotos de sus trabajos para entrenar a la IA." }, { status: 400 });

  // Descarga las fotos (las sube el admin al sitio; se leen de la web pública)
  const imagenes: { b64: string; mime: string }[] = [];
  for (const f of fotos) {
    const img = await fetchUrlBase64(fotoUrl(f)).catch(() => null);
    if (img && img.mime.startsWith("image/")) imagenes.push(img);
  }
  if (imagenes.length < 2)
    return Response.json({ error: "No se pudieron descargar las fotos del sitio. Verifica que estén publicadas." }, { status: 500 });

  try {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: process.env.TRAIN_MODEL || process.env.LANA_MODEL || "claude-haiku-4-5",
      max_tokens: 400,
      system:
        "Eres un curador experto en tatuajes. Vas a ver varios trabajos de UN mismo tatuador. Destila su perfil de estilo en español, en 3-5 frases corridas (sin viñetas ni encabezados): técnica dominante y acabado (línea, sombras, saturación, color o black & grey), temas y motivos recurrentes, y qué tipo de idea de cliente encaja perfecto con este artista. Escribe SOLO el perfil, sin introducción.",
      messages: [
        {
          role: "user",
          content: [
            ...imagenes.map((img) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: img.mime as "image/jpeg", data: img.b64 },
            })),
            {
              type: "text" as const,
              text: `Trabajos del tatuador ${t.alias || t.nombre} (estilos declarados: ${(t.estilos || []).join(", ") || "sin declarar"}).`,
            },
          ],
        },
      ],
    });
    const estiloIA = r.content
      .filter((x) => x.type === "text")
      .map((x) => (x as { text: string }).text)
      .join("")
      .trim()
      .slice(0, 900);
    if (!estiloIA) return Response.json({ error: "La IA no devolvió el perfil. Intenta de nuevo." }, { status: 500 });

    const next = await upsert("tatuadores", { ...t, estiloIA });
    return Response.json({ estiloIA, content: next, fotosAnalizadas: imagenes.length });
  } catch (e) {
    return Response.json({ error: "Visión de Claude: " + (e as Error).message }, { status: 500 });
  }
}
