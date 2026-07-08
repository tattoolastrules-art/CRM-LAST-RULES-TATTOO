// Notificaciones push (Web Push + VAPID). Suscripciones en Neon (clave "push_subs").
import webpush from "web-push";
import { loadJSON, saveJSON } from "./store";

export interface PushSub { endpoint: string; keys: { p256dh: string; auth: string } }

export function pushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

function setup() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:prodyg.studios@gmail.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export async function addPushSub(sub: PushSub): Promise<void> {
  if (!sub?.endpoint) return;
  const subs = await loadJSON<PushSub[]>("push_subs", []);
  if (!subs.some((s) => s.endpoint === sub.endpoint)) {
    subs.unshift(sub);
    await saveJSON("push_subs", subs.slice(0, 40));
  }
}

export async function removePushSub(endpoint: string): Promise<void> {
  const subs = await loadJSON<PushSub[]>("push_subs", []);
  await saveJSON("push_subs", subs.filter((s) => s.endpoint !== endpoint));
}

// Envía la notificación a todos los dispositivos suscritos (best effort)
export async function pushAll(title: string, body: string, url = "/os"): Promise<void> {
  if (!pushConfigured()) return;
  setup();
  const subs = await loadJSON<PushSub[]>("push_subs", []);
  if (!subs.length) return;
  const dead: string[] = [];
  await Promise.all(
    subs.map((s) =>
      webpush
        .sendNotification(s as webpush.PushSubscription, JSON.stringify({ title, body: body.slice(0, 160), url }))
        .catch((e: { statusCode?: number }) => {
          if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.endpoint);
        }),
    ),
  );
  if (dead.length) await saveJSON("push_subs", subs.filter((s) => !dead.includes(s.endpoint)));
}
