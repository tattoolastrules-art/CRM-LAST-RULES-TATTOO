// ANOVA: decide la respuesta automática a un mensaje entrante.
// Regla de costo: saludos/mensajes triviales → respuesta PREDEFINIDA (sin tokens);
// conversación real → Claude con la voz comercial de Lana.

import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./lana-prompt";

const GREETING =
  /^(hola+|buenas+|buenos dias|buenas tardes|buenas noches|hey|holi+|hello|hi|info|informacion|información|precio|leido|leído|ok|listo)[\s!.,?¡¿]*$/i;

export const WELCOME =
  "Hola, qué gusto saludarte 🖤 Soy Lana, de LAST RULES — El Templo de la Piel. ¿Qué Pieza tienes en mente y en qué zona la imaginas? ✨";

export async function anovaReply(
  text: string,
  name: string,
): Promise<{ reply: string; mode: "predefinida" | "anova" }> {
  const t = (text || "").trim();
  if (!t || t.length < 2 || GREETING.test(t) || t.startsWith("[")) {
    return { reply: WELCOME, mode: "predefinida" };
  }
  if (!process.env.ANTHROPIC_API_KEY) return { reply: WELCOME, mode: "predefinida" };

  const client = new Anthropic();
  const system =
    buildSystemPrompt() +
    "\n\nEstás respondiendo por WhatsApp. Responde ÚNICAMENTE con el mensaje para el Coleccionista: breve (2-4 frases), cálido y comercial, siempre acercando al cierre o a la agenda.";
  const r = await client.messages.create({
    model: process.env.LANA_MODEL || "claude-haiku-4-5",
    max_tokens: 300,
    system,
    messages: [{ role: "user", content: `Mensaje de ${name || "un Coleccionista"}: ${t}` }],
  });
  const reply = r.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();
  return { reply: reply || WELCOME, mode: "anova" };
}
