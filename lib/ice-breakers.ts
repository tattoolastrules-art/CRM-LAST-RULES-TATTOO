// Plantillas de bienvenida por canal ("ice breakers"): persistencia — SOLO servidor.
// Tipos, defaults y matching viven en ice-breakers-def.ts (apto navegador).
// - Instagram / Messenger: se publican en Meta (messenger_profile) y aparecen
//   como burbujas al abrir el chat. El toque llega como postback.
// - WhatsApp: no existen ice breakers; el equivalente son BOTONES interactivos
//   que Ana envía en la bienvenida a contactos nuevos (título máx. 20 caracteres).
import { loadJSON, saveJSON } from "./store";
import { IB_DEFAULTS, saneIceBreakers, type IceBreakersConfig } from "./ice-breakers-def";

export type { IceBreaker, IceBreakersConfig } from "./ice-breakers-def";
export { IB_DEFAULTS, ibPayload, findIceBreakerAnswer } from "./ice-breakers-def";

const limpia = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);

export async function getIceBreakers(): Promise<IceBreakersConfig> {
  const c = await loadJSON<Partial<IceBreakersConfig>>("ice_breakers", IB_DEFAULTS);
  return {
    instagram: saneIceBreakers(c.instagram ?? IB_DEFAULTS.instagram, 4, 80),
    facebook: saneIceBreakers(c.facebook ?? IB_DEFAULTS.facebook, 4, 80),
    whatsapp: saneIceBreakers(c.whatsapp ?? IB_DEFAULTS.whatsapp, 3, 20),
    waWelcome: limpia(c.waWelcome ?? IB_DEFAULTS.waWelcome, 300) || IB_DEFAULTS.waWelcome,
  };
}

export async function saveIceBreakers(patch: Partial<IceBreakersConfig>): Promise<IceBreakersConfig> {
  const cur = await getIceBreakers();
  const next: IceBreakersConfig = {
    instagram: patch.instagram ? saneIceBreakers(patch.instagram, 4, 80) : cur.instagram,
    facebook: patch.facebook ? saneIceBreakers(patch.facebook, 4, 80) : cur.facebook,
    whatsapp: patch.whatsapp ? saneIceBreakers(patch.whatsapp, 3, 20) : cur.whatsapp,
    waWelcome: patch.waWelcome !== undefined ? (limpia(patch.waWelcome, 300) || cur.waWelcome) : cur.waWelcome,
  };
  await saveJSON("ice_breakers", next);
  return next;
}
