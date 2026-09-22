// Registra la llave pública de cifrado en el número de WhatsApp Business.
// Requiere haber corrido antes scripts/gen-flow-keys.mjs.
// Uso: node scripts/register-flow-key.mjs
import { readFile } from "node:fs/promises";

const G = "https://graph.facebook.com/v23.0";
const tok = (await readFile(".meta.tmp", "utf8")).match(/EAA[A-Za-z0-9]+/)?.[0];
const phoneId = (await readFile(".env.example", "utf8")).match(/WHATSAPP_PHONE_ID=(\d+)/)?.[1];
if (!tok) { console.log("no hay token en .meta.tmp"); process.exit(1); }
if (!phoneId) { console.log("no encontré WHATSAPP_PHONE_ID"); process.exit(1); }

const publicKey = await readFile(".keys/flow_public.pem", "utf8");

const fd = new FormData();
fd.append("business_public_key", publicKey);
const r = await fetch(`${G}/${phoneId}/whatsapp_business_encryption`, {
  method: "POST",
  headers: { Authorization: `Bearer ${tok}` },
  body: fd,
});
console.log(await r.json());
