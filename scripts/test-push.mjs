import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import webpush from "web-push";
const env = {};
for (const l of (await readFile(".env.local","utf8")).split(/\r?\n/)) { const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/); if(m) env[m[1]]=m[2].trim(); }
webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
const sql = neon(env.DATABASE_URL);
const subs = (await sql`SELECT value FROM app_data WHERE key='push_subs'`)[0].value;
for (const s of subs) {
  try { await webpush.sendNotification(s, JSON.stringify({ title: "🔔 Prueba LAST RULES OS", body: "¡Las notificaciones funcionan! Así te llegarán los mensajes y reservas.", url: "/os" })); console.log("enviada a", s.endpoint.slice(0,40)); }
  catch (e) { console.log("fallo:", e.statusCode || e.message); }
}
