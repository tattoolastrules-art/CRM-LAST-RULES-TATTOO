// Limpia datos ficticios/de prueba de la base (Neon).
import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

const env = {};
for (const l of (await readFile(".env.local", "utf8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const sql = neon(env.DATABASE_URL);

async function get(key) { const r = await sql`SELECT value FROM app_data WHERE key = ${key}`; return r.length ? r[0].value : null; }
async function set(key, v) { await sql`UPDATE app_data SET value = ${JSON.stringify(v)}::jsonb WHERE key = ${key}`; }

const esFake = (s) => /prueba|test/i.test(String(s || ""));

// LEADS: fuera origen "test", el "test user name" del botón de prueba de Meta y los "Prueba..."
const leads = (await get("leads")) || [];
const leadsOk = leads.filter((l) => !(l.origen === "test" || esFake(l.nombre) || l.contacto === "16315551181"));
console.log("leads: quedan", leadsOk.length, "de", leads.length, "| borrados:", leads.filter((l) => !leadsOk.includes(l)).map((l) => l.nombre + " (" + l.origen + ")").join(", ") || "ninguno");
await set("leads", leadsOk);

// CONVOS: fuera la conversación del payload de prueba de Meta (16315551181)
const convos = (await get("convos")) || [];
const convosOk = convos.filter((c) => c.id !== "16315551181");
console.log("convos: quedan", convosOk.length, "de", convos.length);
await set("convos", convosOk);

// CITAS: fuera las que digan prueba/test
const citas = (await get("citas")) || [];
const citasOk = citas.filter((c) => !(esFake(c.coleccionista) || esFake(c.pieza)));
console.log("citas: quedan", citasOk.length, "de", citas.length, "| borradas:", citas.filter((c) => !citasOk.includes(c)).map((c) => c.coleccionista).join(", ") || "ninguna");
await set("citas", citasOk);

// PLANNER: fuera campañas de prueba
const plan = (await get("planner")) || [];
const planOk = plan.filter((p) => !esFake(p.titulo));
console.log("planner: quedan", planOk.length, "de", plan.length);
if (plan.length) await set("planner", planOk);

console.log("LIMPIEZA DE BASE COMPLETA");
