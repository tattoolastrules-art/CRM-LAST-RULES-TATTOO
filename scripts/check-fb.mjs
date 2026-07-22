// Busca eventos de Messenger/página de Facebook en la base.
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
const env = {};
for (const l of (await readFile(".env.local", "utf8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const sql = neon(env.DATABASE_URL);
const ev = (await sql`SELECT value FROM app_data WHERE key='meta_events'`)[0].value;
const pageEv = ev.filter((e) => e.object === "page" || e.object === "permissions" || (e.object !== "whatsapp_business_account" && e.object !== "instagram"));
console.log("eventos de pagina/otros:", pageEv.length);
pageEv.slice(0, 8).forEach((e) => console.log(" -", e.at, "|", e.object, "|", e.summary));
console.log("objetos unicos:", [...new Set(ev.map((e) => e.object))].join(", "));
