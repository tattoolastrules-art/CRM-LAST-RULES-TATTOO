// Ajustes del sistema (editables desde el OS). Almacén en Neon/JSON, clave "settings".
import { loadJSON, saveJSON } from "./store";

export interface Settings {
  anovaAuto: boolean; // respuestas automáticas de ANOVA/Ana en WhatsApp
}

const DEFAULTS: Settings = { anovaAuto: true };

export async function getSettings(): Promise<Settings> {
  return { ...DEFAULTS, ...(await loadJSON<Partial<Settings>>("settings", DEFAULTS)) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const s = { ...(await getSettings()), ...patch };
  await saveJSON("settings", s);
  return s;
}
