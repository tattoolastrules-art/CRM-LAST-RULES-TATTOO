// Ajustes del sistema (editables desde el OS). Almacén en Neon/JSON, clave "settings".
import { loadJSON, saveJSON } from "./store";

export const MODULOS = [
  { id: "flujos", label: "Flujos" },
  { id: "omni", label: "Omnicanal" },
  { id: "crm", label: "CRM" },
  { id: "reservas", label: "Reservas" },
  { id: "planner", label: "Planner" },
  { id: "agenda", label: "Agenda" },
  { id: "sitio", label: "Sitio" },
] as const;

export interface Settings {
  anovaAuto: boolean; // respuestas automáticas de NOVA/Ana en WhatsApp
  modules: Record<string, boolean>; // módulos visibles (solo el dueño los apaga/enciende)
  notifyPhone: string; // WhatsApp del estudio que recibe los avisos importantes
}

const DEFAULT_MODULES: Record<string, boolean> = Object.fromEntries(MODULOS.map((m) => [m.id, true]));
const DEFAULTS: Settings = { anovaAuto: true, modules: DEFAULT_MODULES, notifyPhone: "" };

export async function getSettings(): Promise<Settings> {
  const s = await loadJSON<Partial<Settings>>("settings", DEFAULTS);
  return {
    anovaAuto: s.anovaAuto ?? true,
    modules: { ...DEFAULT_MODULES, ...(s.modules || {}) },
    notifyPhone: s.notifyPhone || "",
  };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const cur = await getSettings();
  const next: Settings = {
    anovaAuto: patch.anovaAuto ?? cur.anovaAuto,
    modules: { ...cur.modules, ...(patch.modules || {}) },
    notifyPhone: (patch.notifyPhone ?? cur.notifyPhone).replace(/[^\d]/g, "").slice(0, 15),
  };
  await saveJSON("settings", next);
  return next;
}
