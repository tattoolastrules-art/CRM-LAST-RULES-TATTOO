// Muestra los eventos de Meta recibidos y los leads por origen (desde Neon).
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const env = {};
try {
  for (const l of (await readFile(".env.local", "utf8")).split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {}
const url = env.DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = neon(url);

const ev = await sql`SELECT value FROM app_data WHERE key = 'meta_events'`;
const events = ev.length ? ev[0].value : [];
console.log("== Eventos de Meta recibidos:", events.length, "==");
events.slice(0, 10).forEach((e) => console.log("  -", e.at, "|", e.summary));

const ld = await sql`SELECT value FROM app_data WHERE key = 'leads'`;
const leads = ld.length ? ld[0].value : [];
const byOrigen = {};
leads.forEach((l) => (byOrigen[l.origen || "?"] = (byOrigen[l.origen || "?"] || 0) + 1));
console.log("\n== Leads por origen ==");
console.log(JSON.stringify(byOrigen, null, 2));
