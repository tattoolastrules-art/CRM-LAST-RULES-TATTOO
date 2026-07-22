// Prueba del aviso al estudio: lee notifyPhone de Neon y envía un WhatsApp.
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const env = {};
for (const l of (await readFile(".env.local", "utf8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const sql = neon(env.DATABASE_URL);
const s = (await sql`SELECT value FROM app_data WHERE key='settings'`)[0]?.value || {};
console.log("notifyPhone guardado:", s.notifyPhone || "(vacio)");
if (!s.notifyPhone) process.exit(0);

const raw = await readFile(".meta.tmp", "utf8");
const tok = raw.match(/EAA[A-Za-z0-9]+/)?.[0];
const to = s.notifyPhone.startsWith("57") ? s.notifyPhone : "57" + s.notifyPhone;
const r = await fetch("https://graph.facebook.com/v21.0/1167992226400931/messages", {
  method: "POST",
  headers: { Authorization: "Bearer " + tok, "Content-Type": "application/json" },
  body: JSON.stringify({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: "🔔 LAST RULES OS\nPrueba de avisos del estudio: por aquí llegarán las citas, abonos y confirmaciones ✅" },
  }),
});
console.log("envio a", to, ":", r.ok ? "OK" : r.status + " " + (await r.text()).slice(0, 200));
