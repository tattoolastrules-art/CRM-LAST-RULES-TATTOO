// Borra la contraseña del usuario chato para que la vuelva a crear en el login.
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
const env = {};
for (const l of (await readFile(".env.local", "utf8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const sql = neon(env.DATABASE_URL);
const rows = await sql`SELECT value FROM app_data WHERE key = 'users'`;
if (!rows.length) { console.log("sin usuarios aún"); process.exit(0); }
const users = rows[0].value;
const u = users.find((x) => x.id === "chato");
if (!u) { console.log("no existe chato"); process.exit(0); }
u.passHash = "";
await sql`UPDATE app_data SET value = ${JSON.stringify(users)}::jsonb WHERE key = 'users'`;
console.log("clave de", u.email, "reiniciada: al entrar creará una nueva");
