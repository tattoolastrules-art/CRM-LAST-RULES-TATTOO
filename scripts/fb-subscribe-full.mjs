// Suscripción COMPLETA de la página: mensajes + comentarios (feed).
// Requiere token de página con pages_manage_metadata (post-aprobación de la app).
import { readFile } from "node:fs/promises";
const tok = (await readFile(".fb.tmp", "utf8")).match(/EAA[A-Za-z0-9]+/)?.[0];
if (!tok) { console.log("no hay token EAA... en .fb.tmp"); process.exit(1); }
const G = "https://graph.facebook.com/v23.0";
const sub = await (await fetch(`${G}/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed&access_token=${tok}`, { method: "POST" })).json();
console.log("suscripcion messages+postbacks+feed:", JSON.stringify(sub));
const check = await (await fetch(`${G}/me/subscribed_apps?access_token=${tok}`)).json();
console.log("estado actual:", JSON.stringify(check));
const perms = await (await fetch(`${G}/me?fields=name,id&access_token=${tok}`)).json();
console.log("pagina:", JSON.stringify(perms));
