// Reservas / leads que llegan del formulario de la web pública.
// Almacén en Neon (o JSON local) bajo la clave "leads".

import { randomUUID } from "crypto";
import { loadJSON, saveJSON } from "./store";

export interface Lead {
  id: string; nombre: string; contacto: string; servicio: string;
  presupuesto: string; idea: string; fecha: string; estado: string; origen: string;
}

const s = (v: unknown, n: number) => String(v ?? "").slice(0, n);

export async function getLeads(): Promise<Lead[]> {
  return loadJSON<Lead[]>("leads", []);
}

export async function addLead(item: Record<string, unknown>): Promise<Lead> {
  const leads = await getLeads();
  const lead: Lead = {
    id: randomUUID().slice(0, 8),
    nombre: s(item.nombre, 120),
    contacto: s(item.contacto, 120),
    servicio: s(item.servicio, 160),
    presupuesto: s(item.presupuesto, 160),
    idea: s(item.idea, 1200),
    fecha: new Date().toISOString(),
    estado: "nuevo",
    origen: s(item.origen || "web", 40),
  };
  leads.unshift(lead);
  await saveJSON("leads", leads.slice(0, 500));
  return lead;
}

export async function updateLead(id: string, patch: Partial<Lead>) {
  const leads = await getLeads();
  const i = leads.findIndex((l) => l.id === id);
  if (i >= 0) { leads[i] = { ...leads[i], ...patch, id }; await saveJSON("leads", leads); }
  return leads;
}

export async function removeLead(id: string) {
  const leads = (await getLeads()).filter((l) => l.id !== id);
  await saveJSON("leads", leads);
  return leads;
}
