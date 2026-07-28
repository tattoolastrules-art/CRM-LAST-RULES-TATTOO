// Crea (o consulta) las plantillas de WhatsApp para mensajes fuera de la ventana de 24h.
// Uso: node scripts/wa-templates.mjs          -> crea las plantillas
//      node scripts/wa-templates.mjs status   -> muestra el estado de aprobación
import { readFile } from "node:fs/promises";
const WABA = "1051366577319724";
const G = "https://graph.facebook.com/v23.0";
const tok = (await readFile(".meta.tmp", "utf8")).match(/EAA[A-Za-z0-9]+/)?.[0];
if (!tok) { console.log("no hay token en .meta.tmp"); process.exit(1); }

if (process.argv[2] === "status") {
  const r = await (await fetch(`${G}/${WABA}/message_templates?fields=name,status,category,language&limit=30&access_token=${tok}`)).json();
  for (const t of r.data || []) console.log(`${t.name} [${t.language}] -> ${t.status} (${t.category})`);
  if (!r.data?.length) console.log("sin plantillas aún", JSON.stringify(r).slice(0, 300));
  process.exit(0);
}

const TEMPLATES = [
  {
    name: "lr_confirmacion_cita",
    language: "es",
    category: "UTILITY",
    allow_category_change: true,
    components: [
      {
        type: "BODY",
        text: "¡Hola {{1}}! Te escribo de Last Rules Tattoo 🖤 Tienes tu cita {{2}}. Llega con buena comida, bien hidratado(a) y ropa cómoda. ¿Nos confirmas que asistes?",
        example: { body_text: [["Laura", "el viernes 1 de agosto a las 3:00 p. m."]] },
      },
      {
        type: "BUTTONS",
        buttons: [
          { type: "QUICK_REPLY", text: "Confirmo" },
          { type: "QUICK_REPLY", text: "Necesito moverla" },
        ],
      },
    ],
  },
  {
    name: "lr_seguimiento",
    language: "es",
    category: "UTILITY",
    allow_category_change: true,
    components: [
      {
        type: "BODY",
        text: "¡Hola {{1}}! Te escribo de Last Rules Tattoo 🖤 {{2}} Cualquier duda me escribes por aquí.",
        example: { body_text: [["Laura", "¿Cómo amaneció tu tatuaje? Recuerda: jabón neutro 2 veces al día y crema sin fragancia en capa fina."]] },
      },
    ],
  },
];

for (const t of TEMPLATES) {
  const r = await (await fetch(`${G}/${WABA}/message_templates?access_token=${tok}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(t),
  })).json();
  console.log(t.name, "->", JSON.stringify(r).slice(0, 400));
}
