import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/lana-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Modelo configurable. Haiku 4.5 = rápido y económico para chat de alto volumen.
// Para más calidad: LANA_MODEL=claude-sonnet-4-6 o claude-opus-4-8 en .env.local
const MODEL = process.env.LANA_MODEL || "claude-haiku-4-5";

type InMsg = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "Falta ANTHROPIC_API_KEY en .env.local" },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json()) as {
      messages?: InMsg[];
      context?: Record<string, unknown>;
    };
    const messages = (body.messages ?? []).map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(m.content),
    }));

    if (messages.length === 0) {
      return Response.json({ error: "Sin mensajes" }, { status: 400 });
    }

    const ctx = body.context
      ? `\n\nCONTEXTO DE ESTA CONVERSACION (no lo repitas literal): ${JSON.stringify(
          body.context,
        )}`
      : "";

    const system =
      buildSystemPrompt() +
      ctx +
      "\n\nIMPORTANTE: responde ÚNICAMENTE con el mensaje para el Coleccionista, sin explicaciones, sin razonamiento, sin comillas.";

    const client = new Anthropic();
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system,
      messages,
    });

    const reply = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return Response.json({ reply, model: MODEL });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error generando respuesta";
    return Response.json({ error: msg }, { status: 500 });
  }
}
