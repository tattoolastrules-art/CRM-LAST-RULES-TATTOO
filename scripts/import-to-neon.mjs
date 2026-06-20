// Importa data/content.json y data/users.json a Neon (tabla app_data).
// Carga DATABASE_URL desde .env.local. Uso: node scripts/import-to-neon.mjs
import { readFile } from "node:fs/promises";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const root = process.cwd();
const env = {};
try {
  const raw = await readFile(path.join(root, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {}

const url = env.DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("FALTA DATABASE_URL en .env.local");
  process.exit(1);
}

const sql = neon(url);
await sql`CREATE TABLE IF NOT EXISTS app_data (key text PRIMARY KEY, value jsonb NOT NULL)`;

async function imp(key) {
  try {
    const data = JSON.parse(await readFile(path.join(root, "data", key + ".json"), "utf8"));
    await sql`INSERT INTO app_data (key, value) VALUES (${key}, ${JSON.stringify(data)}::jsonb)
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    console.log("importado:", key);
  } catch (e) {
    console.log("omitido:", key, "-", e.message);
  }
}

await imp("content");
await imp("users");

const rows = await sql`SELECT key FROM app_data ORDER BY key`;
console.log("claves en Neon:", rows.map((r) => r.key).join(", ") || "(ninguna)");
console.log("OK Neon conectado");
