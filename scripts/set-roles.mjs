// Ajusta roles en la base Neon: Alejandro = admin, Chato = admin.
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
if (!url) { console.error("Falta DATABASE_URL en .env.local"); process.exit(1); }

const sql = neon(url);
const rows = await sql`SELECT value FROM app_data WHERE key = 'users'`;
if (!rows.length) {
  console.log("Aún no hay usuarios en Neon (nadie ha entrado al OS). El seed ya deja a Alejandro como admin.");
  process.exit(0);
}
const users = rows[0].value;
for (const u of users) {
  if (u.id === "alejandro") u.role = "admin";
  if (u.id === "chato") u.role = "admin";
}
await sql`UPDATE app_data SET value = ${JSON.stringify(users)}::jsonb WHERE key = 'users'`;
console.log("Roles actualizados en Neon:");
for (const u of users) console.log("  -", (u.name || u.id), "=>", u.role, "(" + u.email + ")");
