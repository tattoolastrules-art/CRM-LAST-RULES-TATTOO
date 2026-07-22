import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
const env = {};
for (const l of (await readFile(".env.local","utf8")).split(/\r?\n/)) { const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/); if(m) env[m[1]]=m[2].trim(); }
const sql = neon(env.DATABASE_URL);
const rows = await sql`SELECT value FROM app_data WHERE key='push_subs'`;
const subs = rows.length ? rows[0].value : [];
console.log("dispositivos suscritos:", subs.length);
subs.forEach((s,i)=>console.log(" ", i+1, s.endpoint.slice(0,60)+"..."));
