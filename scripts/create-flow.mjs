// Crea (o actualiza) y publica el WhatsApp Flow "Servicios" a partir de flows/servicios.json.
// Uso: node scripts/create-flow.mjs            -> crea el Flow (una sola vez)
//      node scripts/create-flow.mjs update ID  -> sube una nueva versión del JSON a un Flow existente
//      node scripts/create-flow.mjs publish ID -> publica el Flow (queda visible para enviar)
import { readFile } from "node:fs/promises";

const WABA = "1051366577319724";
const G = "https://graph.facebook.com/v23.0";
const tok = (await readFile(".meta.tmp", "utf8")).match(/EAA[A-Za-z0-9]+/)?.[0];
if (!tok) { console.log("no hay token en .meta.tmp"); process.exit(1); }

const cmd = process.argv[2];
const flowId = process.argv[3];

if (cmd === "publish") {
  if (!flowId) { console.log("uso: node scripts/create-flow.mjs publish <FLOW_ID>"); process.exit(1); }
  const r = await fetch(`${G}/${flowId}/publish?access_token=${tok}`, { method: "POST" });
  console.log(await r.json());
  process.exit(0);
}

const flowJson = await readFile("flows/servicios.json", "utf8");

if (cmd === "update") {
  if (!flowId) { console.log("uso: node scripts/create-flow.mjs update <FLOW_ID>"); process.exit(1); }
  const fd = new FormData();
  fd.append("file", new Blob([flowJson], { type: "application/json" }), "flow.json");
  fd.append("name", "flow.json");
  fd.append("asset_type", "FLOW_JSON");
  const r = await fetch(`${G}/${flowId}/assets`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}` },
    body: fd,
  });
  console.log(await r.json());
  process.exit(0);
}

// Crear el Flow por primera vez
const r = await fetch(`${G}/${WABA}/flows`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
  body: JSON.stringify({
    name: "Servicios Last Rules Tattoo",
    categories: ["APPOINTMENT_BOOKING", "CUSTOMER_SUPPORT"],
    endpoint_uri: "https://app.lastrulestattoo.com/api/whatsapp-flow",
  }),
});
const created = await r.json();
console.log("CREADO:", created);
if (!created.id) process.exit(1);

console.log("\nSubiendo el JSON de pantallas...");
const fd = new FormData();
fd.append("file", new Blob([flowJson], { type: "application/json" }), "flow.json");
fd.append("name", "flow.json");
fd.append("asset_type", "FLOW_JSON");
const r2 = await fetch(`${G}/${created.id}/assets`, {
  method: "POST",
  headers: { Authorization: `Bearer ${tok}` },
  body: fd,
});
console.log("JSON SUBIDO:", await r2.json());

console.log(`\nListo. Guarda esto como WHATSAPP_FLOW_ID en Vercel: ${created.id}`);
console.log(`Cuando esté todo probado: node scripts/create-flow.mjs publish ${created.id}`);
