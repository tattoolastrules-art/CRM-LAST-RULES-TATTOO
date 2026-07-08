import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
const env = {};
for (const l of (await readFile(".env.local","utf8")).split(/\r?\n/)) { const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/); if(m) env[m[1]]=m[2].trim(); }
const sql = neon(env.DATABASE_URL);
const ev = (await sql`SELECT value FROM app_data WHERE key='meta_events'`)[0].value;
for (const e of ev.slice(0,2)) {
  const v = e.raw?.entry?.[0]?.changes?.[0]?.value || {};
  if (v.messages) console.log("ENTRANTE:", v.contacts?.[0]?.profile?.name, "|", v.messages[0]?.from, "|", v.messages[0]?.text?.body);
  else if (v.statuses) console.log("status:", v.statuses[0]?.status, "->", v.statuses[0]?.recipient_id);
  else console.log("otro:", JSON.stringify(v).slice(0,120));
}
const leads = (await sql`SELECT value FROM app_data WHERE key='leads'`)[0].value;
console.log("LEADS whatsapp:", leads.filter(l=>l.origen==="whatsapp").map(l=>l.nombre+": "+l.idea).join(" || "));
