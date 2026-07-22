// Suscribe la página de Facebook a los webhooks de la app (messages, postbacks, feed).
import { readFile } from "node:fs/promises";

const raw = await readFile(".fb.tmp", "utf8");
const tok = raw.match(/EAA[A-Za-z0-9]+/)?.[0];
if (!tok) { console.log("No hay token EAA en .fb.tmp"); process.exit(1); }

const me = await (await fetch("https://graph.facebook.com/v21.0/me?access_token=" + tok)).json();
console.log("token pertenece a:", JSON.stringify(me));

const sub = await (await fetch("https://graph.facebook.com/v21.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed&access_token=" + tok, { method: "POST" })).json();
console.log("suscripcion:", JSON.stringify(sub));

const check = await (await fetch("https://graph.facebook.com/v21.0/me/subscribed_apps?access_token=" + tok)).json();
console.log("verificacion:", JSON.stringify(check).slice(0, 300));
