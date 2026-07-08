// Actualiza el WhatsApp de contacto en Neon (content.info.whatsapp) y publica el content.json al sitio.
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { neon } from "@neondatabase/serverless";
import { Client } from "basic-ftp";

async function loadEnv(file) {
  const o = {};
  try {
    for (const l of (await readFile(file, "utf8")).split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
      if (m) o[m[1]] = m[2].trim();
    }
  } catch {}
  return o;
}

const local = await loadEnv(".env.local");
const cp = await loadEnv(".cpanel.env");
const sql = neon(local.DATABASE_URL);
const rows = await sql`SELECT value FROM app_data WHERE key = 'content'`;
const content = rows[0].value;
content.info.whatsapp = "573204530194";
await sql`UPDATE app_data SET value = ${JSON.stringify(content)}::jsonb WHERE key = 'content'`;
console.log("Neon: whatsapp ->", content.info.whatsapp);

const c = new Client(30000);
try {
  await c.access({
    host: cp.FTP_HOST, user: cp.FTP_USER, password: cp.FTP_PASS,
    port: Number(cp.FTP_PORT) || 21, secure: true, secureOptions: { rejectUnauthorized: false },
  });
  await c.ensureDir("/data");
  await c.uploadFrom(Readable.from([Buffer.from(JSON.stringify(content))]), "content.json");
  console.log("content.json publicado al sitio.");
} finally {
  c.close();
}
