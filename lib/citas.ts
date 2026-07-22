// Citas manuales de la Agenda (clave "citas" en Neon).
import { randomUUID } from "crypto";
import { loadJSON, saveJSON } from "./store";

export interface Cita {
  id: string;
  maestroId: string;
  coleccionista: string;
  pieza: string;
  fecha: string; // YYYY-MM-DD
  start: number; // hora 10..20
  durHours: number;
  tipo: "sesion" | "asesoria";
  abono: boolean;
  estilo: string; // tipo de tatuaje (realismo, fine line, blackwork...)
}

export async function getCitas(): Promise<Cita[]> {
  return loadJSON<Cita[]>("citas", []);
}

export async function upsertCita(item: Partial<Cita>): Promise<Cita[]> {
  const citas = await getCitas();
  const id = item.id || randomUUID().slice(0, 8);
  const clean: Cita = {
    id,
    maestroId: String(item.maestroId || "lobo").slice(0, 30),
    coleccionista: String(item.coleccionista || "").slice(0, 80),
    pieza: String(item.pieza || "").slice(0, 120),
    fecha: String(item.fecha || "").slice(0, 10),
    start: Math.max(6, Math.min(22, Number(item.start) || 10)),
    durHours: Math.max(1, Math.min(10, Number(item.durHours) || 1)),
    tipo: item.tipo === "asesoria" ? "asesoria" : "sesion",
    abono: !!item.abono,
    estilo: String(item.estilo || "").slice(0, 40),
  };
  const i = citas.findIndex((c) => c.id === id);
  if (i >= 0) citas[i] = clean;
  else citas.unshift(clean);
  await saveJSON("citas", citas.slice(0, 400));
  return citas;
}

export async function removeCita(id: string): Promise<Cita[]> {
  const citas = (await getCitas()).filter((c) => c.id !== id);
  await saveJSON("citas", citas);
  return citas;
}
