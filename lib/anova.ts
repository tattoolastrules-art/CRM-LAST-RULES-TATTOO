// NOVA: decide la respuesta automática a un mensaje entrante.
// Regla de costo: saludos/mensajes triviales → respuesta PREDEFINIDA (sin tokens);
// conversación real → Claude con la voz comercial de Ana.

import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./lana-prompt";

const GREETING =
  /^(hola+|buenas+|buenos dias|buenas tardes|buenas noches|hey|holi+|hello|hi|info|informacion|información|precio|leido|leído|ok|listo)[\s!.,?¡¿]*$/i;

// Bienvenidas humanas (se rota una al azar para no sonar robótico)
const WELCOMES = [
  "¡Hola! Qué bueno que escribes 🖤 Soy Ana, de Last Rules. Cuéntame… ¿ya tienes clara la idea o andas buscando inspiración?",
  "¡Hey, bienvenid@ a Last Rules! 🖤 Soy Ana. Dime, ¿qué tienes en mente? ¿algo delicado, algo con presencia…? ✨",
  "¡Hola! Soy Ana, de Last Rules 🤍 Me encanta que estés aquí. ¿Qué idea traes en la cabeza para tu piel?",
];
export const WELCOME = WELCOMES[0];
export function randomWelcome() {
  return WELCOMES[Math.floor(Math.random() * WELCOMES.length)];
}

// Respuestas PREDEFINIDAS por tipo de mensaje (sin gastar tokens), en voz humana de Ana
const TYPE_REPLIES: Record<string, string[]> = {
  sticker: [
    "Jaja buenísimo 🖤 Bueno, cuéntame… ¿qué idea traes en mente para tu piel?",
    "Me encantó jaja 🤍 Y dime, ¿ya tienes pensada tu próxima Pieza?",
  ],
  audio: [
    "¡Te escuché! Dame un momento… mientras tanto, ¿me resumes la idea en texto? Así se la paso exacta a Los Maestros 🖤",
    "Recibí tu nota de voz 🤍 Para no perder ningún detalle, ¿me lo escribes en un mensajito? Y de una lo movemos.",
  ],
  video: [
    "¡Vi el video! Qué buena referencia 🖤 ¿En qué zona del cuerpo lo imaginas y de qué tamaño más o menos?",
    "Recibido el video 🤍 Cuéntame, ¿esa es la idea que quieres para tu Pieza?",
  ],
  document: [
    "Recibí el archivo 🤍 Lo reviso con Los Maestros. Cuéntame mientras tanto, ¿qué tienes en mente?",
  ],
  location: [
    "¡Gracias por la ubicación! Nosotros estamos en Cl. 52 #25-14, Galerías 📍 ¿Agendamos tu visita? 🖤",
  ],
  contacts: [
    "¡Recibido el contacto! 🤍 ¿Le digo a esa persona que escriba, o me cuentas tú qué Pieza tienen en mente?",
  ],
  image: [
    "¡La vi! Buena referencia 🖤 Cuéntame: ¿en qué zona del cuerpo la imaginas y de qué tamaño aprox?",
  ],
};

export function typeReply(type: string): string | null {
  const arr = TYPE_REPLIES[type];
  if (!arr) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// Visión: Ana MIRA la imagen de referencia y responde sobre ella
export async function anovaVision(
  b64: string,
  mime: string,
  caption: string,
  name: string,
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  try {
    const client = new Anthropic();
    const system =
      buildSystemPrompt() +
      "\n\nEl Coleccionista acaba de enviarte una IMAGEN por WhatsApp (probablemente una referencia de tatuaje). Mira la imagen, coméntala breve y con criterio de asesora de arte (qué es, qué estilo se le ve), y avanza: pregunta zona del cuerpo o tamaño. Responde ÚNICAMENTE con el mensaje (2-4 frases).";
    const r = await client.messages.create({
      model: process.env.LANA_MODEL || "claude-haiku-4-5",
      max_tokens: 300,
      system,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mime as "image/jpeg", data: b64 } },
            { type: "text", text: `Mensaje de ${name || "un Coleccionista"}${caption ? ': "' + caption + '"' : " (imagen sin texto)"}` },
          ],
        },
      ],
    });
    const reply = r.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
    return reply || null;
  } catch {
    return null;
  }
}

export async function anovaReply(
  text: string,
  name: string,
): Promise<{ reply: string; mode: "predefinida" | "anova" }> {
  const t = (text || "").trim();
  if (!t || t.length < 2 || GREETING.test(t) || t.startsWith("[")) {
    return { reply: randomWelcome(), mode: "predefinida" };
  }
  if (!process.env.ANTHROPIC_API_KEY) return { reply: randomWelcome(), mode: "predefinida" };

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
  return { reply: reply || randomWelcome(), mode: "anova" };
}
