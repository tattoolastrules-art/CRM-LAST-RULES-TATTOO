// Guarda el link real de reseñas de Google en la config de seguimientos (Neon).
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const LINK = "https://search.google.com/local/writereview?placeid=ChIJ8w-QfZCbP44RdNwHtlfwNwY";

const env = {};
for (const l of (await readFile(".env.local", "utf8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const sql = neon(env.DATABASE_URL);
const rows = await sql`SELECT value FROM app_data WHERE key = 'followups'`;
const cfg = rows.length ? rows[0].value : {};
cfg.reviewLink = LINK;
if (rows.length) await sql`UPDATE app_data SET value = ${JSON.stringify(cfg)}::jsonb WHERE key = 'followups'`;
else await sql`INSERT INTO app_data (key, value) VALUES ('followups', ${JSON.stringify(cfg)}::jsonb)`;
console.log("reviewLink guardado:", LINK);
