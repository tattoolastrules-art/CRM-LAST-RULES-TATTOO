// Suscripción mínima de la página: solo mensajes (sin feed).
import { readFile } from "node:fs/promises";
const tok = (await readFile(".fb.tmp", "utf8")).match(/EAA[A-Za-z0-9]+/)?.[0];
const sub = await (await fetch("https://graph.facebook.com/v21.0/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=" + tok, { method: "POST" })).json();
console.log("suscripcion messages+postbacks:", JSON.stringify(sub));
const sub2 = await (await fetch("https://graph.facebook.com/v21.0/me/subscribed_apps?subscribed_fields=messages&access_token=" + tok, { method: "POST" })).json();
console.log("suscripcion solo messages:", JSON.stringify(sub2));
