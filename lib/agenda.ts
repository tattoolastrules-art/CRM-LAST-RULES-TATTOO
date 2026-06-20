// Agenda de Los Maestros (tatuadores) — base para sincronizar con Google Calendar.

export interface Maestro {
  id: string;
  name: string; // nombre artístico (de cara al Coleccionista nunca el real)
  styles: string[];
  color: string;
}

export interface CalAppt {
  id: string;
  maestroId: string;
  coleccionista: string;
  day: number; // 0 = lunes … 6 = domingo
  start: number; // hora (24h)
  durHours: number;
  type: "asesoria" | "sesion";
  abono: boolean;
  pieza?: string;
}

export const MAESTROS: Maestro[] = [
  { id: "m1", name: "El Lobo", styles: ["Dark work", "Realismo"], color: "#C5A059" },
  { id: "m2", name: "Aguja Fina", styles: ["Línea fina", "Lettering"], color: "#5B8CB7" },
  { id: "m3", name: "Tinta Negra", styles: ["Neo-tribal", "Blackwork"], color: "#8E7CC3" },
  { id: "m4", name: "Maestra Ámbar", styles: ["Color", "Cover up"], color: "#3FB37F" },
];

export const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
export const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const APPOINTMENTS: CalAppt[] = [
  { id: "a1", maestroId: "m1", coleccionista: "Mateo Rincón", day: 5, start: 11, durHours: 4, type: "sesion", abono: true, pieza: "León dark work" },
  { id: "a2", maestroId: "m2", coleccionista: "Sara Delgado", day: 5, start: 15, durHours: 1, type: "asesoria", abono: false, pieza: "Asesoría" },
  { id: "a3", maestroId: "m4", coleccionista: "Laura Tatis", day: 6, start: 10, durHours: 5, type: "sesion", abono: true, pieza: "Retrato espalda" },
  { id: "a4", maestroId: "m2", coleccionista: "Daniela Pérez", day: 3, start: 16, durHours: 3, type: "sesion", abono: true, pieza: "Serpiente fine line" },
  { id: "a5", maestroId: "m3", coleccionista: "ana.lucia", day: 4, start: 12, durHours: 3, type: "sesion", abono: true, pieza: "Mandala hombro" },
  { id: "a6", maestroId: "m1", coleccionista: "Andrés Gómez", day: 2, start: 13, durHours: 1, type: "asesoria", abono: false, pieza: "Asesoría manga" },
  { id: "a7", maestroId: "m3", coleccionista: "Felipe Cano", day: 1, start: 14, durHours: 2, type: "sesion", abono: true, pieza: "Cover up dark" },
  { id: "a8", maestroId: "m2", coleccionista: "Nicolás Vega", day: 6, start: 16, durHours: 2, type: "sesion", abono: true, pieza: "Lettering antebrazo" },
  { id: "a9", maestroId: "m4", coleccionista: "Stephanie Cruz", day: 4, start: 17, durHours: 1, type: "asesoria", abono: false, pieza: "Asesoría microrealismo" },
  { id: "a10", maestroId: "m1", coleccionista: "Isabella Ruiz", day: 0, start: 15, durHours: 2, type: "sesion", abono: true, pieza: "(con acudiente)" },
  { id: "a11", maestroId: "m3", coleccionista: "juanpa.ink", day: 2, start: 17, durHours: 3, type: "sesion", abono: false, pieza: "Neo-tribal pecho" },
];

// Lunes de la semana actual (para fechar el calendario)
export function mondayOf(d = new Date()) {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0 = lunes
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
