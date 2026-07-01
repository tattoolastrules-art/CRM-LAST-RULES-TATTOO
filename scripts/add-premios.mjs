// Agrega la colección "premios" al contenido en Neon (si falta) y publica el content.json al sitio.
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { neon } from "@neondatabase/serverless";
import { Client } from "basic-ftp";

async function loadEnv(file) {
  const o = {};
  try {
    const raw = await readFile(file, "utf8");
    for (const l of raw.split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
      if (m) o[m[1]] = m[2].trim();
    }
  } catch {}
  return o;
}

const SEED_PREMIOS = [
  { id: "pr1", titulo: "Mejor Tatuaje", evento: "Tattoo Music Fest", anio: "", imagenUrl: "", activo: true },
  { id: "pr2", titulo: "Convención", evento: "Milano, Italia", anio: "2025", imagenUrl: "", activo: true },
  { id: "pr3", titulo: "Convención", evento: "Ofenbourg, Alemania", anio: "", imagenUrl: "", activo: true },
  { id: "pr4", titulo: "Expotattoo", evento: "Bogotá & Medellín", anio: "", imagenUrl: "", activo: true },
  { id: "pr5", titulo: "Expo Tatuaje", evento: "Ecuador", anio: "", imagenUrl: "", activo: true },
];

const local = await loadEnv(".env.local");
const cp = await loadEnv(".cpanel.env");
const url = local.DATABASE_URL || process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }

const sql = neon(url);
const rows = await sql`SELECT value FROM app_data WHERE key = 'content'`;
if (!rows.length) { console.error("No hay content en Neon."); process.exit(1); }
const content = rows[0].value;

if (!Array.isArray(content.premios) || content.premios.length === 0) {
  content.premios = SEED_PREMIOS;
  await sql`UPDATE app_data SET value = ${JSON.stringify(content)}::jsonb WHERE key = 'content'`;
  console.log("Premios agregados a Neon:", content.premios.length);
} else {
  console.log("Neon ya tenía premios:", content.premios.length);
}

// Publicar content.json al sitio en vivo
const c = new Client(30000);
try {
  await c.access({
    host: cp.FTP_HOST, user: cp.FTP_USER, password: cp.FTP_PASS,
    port: Number(cp.FTP_PORT) || 21, secure: true, secureOptions: { rejectUnauthorized: false },
  });
  await c.ensureDir("/data");
  await c.uploadFrom(Readable.from([Buffer.from(JSON.stringify(content))]), "content.json");
  console.log("content.json publicado al sitio en vivo.");
} finally {
  c.close();
}
