// Comentarios de Instagram y Facebook (clave "comments" en Neon).
// El webhook los registra; el panel Comentarios del inbox permite responder,
// dar like (solo Facebook: Instagram no lo permite por API) y ocultar.
import { loadJSON, saveJSON } from "./store";

export interface StudioComment {
  id: string; // id del comentario en Meta (sirve para responder/like/ocultar)
  platform: "instagram" | "facebook";
  from: string;
  fromId?: string;
  text: string;
  at: string;
  postId?: string;
  replied?: { text: string; at: string };
  liked?: boolean;
  hidden?: boolean;
  dmSent?: boolean; // se le envió DM automático (comentario con intención de compra)
}

export async function getComments(): Promise<StudioComment[]> {
  return loadJSON<StudioComment[]>("comments", []);
}

// Devuelve true si el comentario es nuevo (para responderlo UNA sola vez)
export async function addComment(c: StudioComment): Promise<boolean> {
  if (!c.id) return false;
  const all = await getComments();
  if (all.some((x) => x.id === c.id)) return false; // Meta reenvía eventos: sin duplicados
  all.unshift(c);
  await saveJSON("comments", all.slice(0, 200));
  return true;
}

export async function patchComment(id: string, patch: Partial<StudioComment>): Promise<StudioComment | null> {
  const all = await getComments();
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  Object.assign(c, patch);
  await saveJSON("comments", all);
  return c;
}
