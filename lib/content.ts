// Capa de contenido de la web pública (tatuadores, publicaciones, noticias, info).
// Almacén en archivo JSON (data/content.json) — funciona ya, sin credenciales.
// Migrable a Neon/Postgres después: solo se cambia esta capa.

import { randomUUID } from "crypto";
import { loadJSON, saveJSON } from "./store";

export interface Tatuador {
  id: string; nombre: string; alias: string; estilos: string[];
  bio: string; fotoUrl: string; instagram: string; activo: boolean;
}
export interface Publicacion {
  id: string; titulo: string; descripcion: string; imagenUrl: string;
  tatuador: string; fecha: string; destacado: boolean;
}
export interface Noticia {
  id: string; titulo: string; cuerpo: string; imagenUrl: string;
  fecha: string; publicada: boolean;
}
export interface Premio {
  id: string; titulo: string; evento: string; anio: string; imagenUrl: string; activo: boolean;
}
export interface SiteInfo {
  nombre: string; lema: string; ciudad: string; direccion: string;
  horario: string; whatsapp: string; instagram: string; portada: string;
}
export type Coleccion = "tatuadores" | "publicaciones" | "noticias" | "premios";
export interface SiteContent {
  info: SiteInfo;
  tatuadores: Tatuador[];
  publicaciones: Publicacion[];
  noticias: Noticia[];
  premios: Premio[];
}

const SEED: SiteContent = {
  info: {
    nombre: "LAST RULES",
    lema: "El Templo de la Piel",
    ciudad: "Bogotá, Colombia",
    direccion: "El Templo · Bogotá (cita previa)",
    horario: "Mar – Sáb · 11:00 am – 8:00 pm",
    whatsapp: "573204530194",
    instagram: "@lastrules",
    portada: "",
  },
  tatuadores: [
    { id: "alejo", nombre: "Alejandro Martín", alias: "Alejo", estilos: ["Fundador", "Neo-Tradicional & Sombras"], bio: "Con 12 años de experiencia, es el visionario y fundador de Last Rules. Máster y Mejor Tatuaje en el Tattoo Music Fest.", fotoUrl: "assets/TATUADORES/ALEJO_1.png", instagram: "@Alejo_tak", activo: true },
    { id: "jose", nombre: "José Méndez", alias: "Joselo", estilos: ["Fundador", "Realismo Black & Grey"], bio: "Pilar y cofundador. Dominando formatos inmensos, ha conquistado 12 galardones en eventos titánicos.", fotoUrl: "assets/TATUADORES/JOSELO_1.png", instagram: "@josemendezart", activo: true },
    { id: "laura", nombre: "Laura Illustration", alias: "Laura", estilos: ["Surrealismo & Realismo Color"], bio: "Galardonada como Mejor Artista Femenina y patrocinada por Vice Colors. Su estilo la llevó a Londres y Milano 2025.", fotoUrl: "assets/TATUADORES/LAURA_1.png", instagram: "@laura_illus__", activo: true },
    { id: "karman", nombre: "Camilo \"Karman\"", alias: "Karman", estilos: ["Chicano Style & Lettering"], bio: "Nacido de la cultura urbana. Es poseedor de casi 20 reconocimientos, siendo tricampeón consecutivo en Lettering en el BTF.", fotoUrl: "", instagram: "@karman.98", activo: true },
    { id: "badchico", nombre: "Alej. \"Bad Chico\"", alias: "Bad Chico", estilos: ["Ornamental Style & Blackwork"], bio: "Bad Chico mezcla la fluidez del graffiti con la arquitectura del estilo Ornamental. Viajó a la meca del tatuaje en Alemania.", fotoUrl: "assets/TATUADORES/BADCHIKO_1.png", instagram: "@badchik0", activo: true },
    { id: "yami", nombre: "Yami Urrego", alias: "Yami", estilos: ["Fine Line & Minimalismo"], bio: "Arquitecta del detalle milimétrico. Reconocida por sus líneas perfectas y sombras inmaculadas hasta Aruba.", fotoUrl: "assets/TATUADORES/YAMI_1.png", instagram: "@Inky.ami", activo: true },
    { id: "duvan", nombre: "Duvan", alias: "Duvan", estilos: ["Especialidad del Artista"], bio: "Información y biografía del artista en construcción. Pronto revelaremos más detalles sobre su estilo y trayectoria.", fotoUrl: "assets/TATUADORES/DUVAN_1.png", instagram: "@instagram_duvan", activo: true },
  ],
  publicaciones: [
    { id: "p1", titulo: "Obra 1", descripcion: "", imagenUrl: "assets/TATTOO/TATTOO_1.png", tatuador: "", fecha: "", destacado: true },
    { id: "p2", titulo: "Obra 2", descripcion: "", imagenUrl: "assets/TATTOO/TATTOO_2.png", tatuador: "", fecha: "", destacado: true },
    { id: "p3", titulo: "Obra 3", descripcion: "", imagenUrl: "assets/TATTOO/TATTOO_3.png", tatuador: "", fecha: "", destacado: true },
    { id: "p4", titulo: "Obra 4", descripcion: "", imagenUrl: "assets/TATTOO/TATTOO_4.png", tatuador: "", fecha: "", destacado: true },
    { id: "p5", titulo: "Obra 5", descripcion: "", imagenUrl: "assets/TATTOO/TATTOO_5.png", tatuador: "", fecha: "", destacado: true },
    { id: "p6", titulo: "Obra 6", descripcion: "", imagenUrl: "assets/TATTOO/TATTOO_6.png", tatuador: "", fecha: "", destacado: true },
    { id: "p7", titulo: "Obra 7", descripcion: "", imagenUrl: "assets/TATTOO/TATTOO_7.png", tatuador: "", fecha: "", destacado: true },
    { id: "p8", titulo: "Obra 8", descripcion: "", imagenUrl: "assets/TATTOO/TATTOO_8.png", tatuador: "", fecha: "", destacado: true },
    { id: "p9", titulo: "Obra 9", descripcion: "", imagenUrl: "assets/TATTOO/TATTOO_9.png", tatuador: "", fecha: "", destacado: true },
  ],
  noticias: [
    { id: "n1", titulo: "Gira por Medellín en julio", cuerpo: "Los Maestros viajan a Medellín. Cupos limitados, reserva con abono.", imagenUrl: "", fecha: "2026-06-15", publicada: true },
    { id: "n2", titulo: "Nuevos horarios de asesoría", cuerpo: "Asesorías gratis de martes a jueves. Agenda por WhatsApp.", imagenUrl: "", fecha: "2026-06-01", publicada: true },
  ],
  premios: [
    { id: "pr1", titulo: "Mejor Tatuaje", evento: "Tattoo Music Fest", anio: "", imagenUrl: "", activo: true },
    { id: "pr2", titulo: "Convención", evento: "Milano, Italia", anio: "2025", imagenUrl: "", activo: true },
    { id: "pr3", titulo: "Convención", evento: "Ofenbourg, Alemania", anio: "", imagenUrl: "", activo: true },
    { id: "pr4", titulo: "Expotattoo", evento: "Bogotá & Medellín", anio: "", imagenUrl: "", activo: true },
    { id: "pr5", titulo: "Expo Tatuaje", evento: "Ecuador", anio: "", imagenUrl: "", activo: true },
  ],
};

function save(c: SiteContent) {
  return saveJSON("content", c);
}

export async function getContent(): Promise<SiteContent> {
  return loadJSON("content", SEED);
}

export async function upsert(type: Coleccion, item: Record<string, unknown>) {
  const c = await getContent();
  const arr = (c[type] as Array<{ id: string }>) || [];
  const id = (item.id as string) || randomUUID().slice(0, 8);
  const i = arr.findIndex((x) => x.id === id);
  if (i >= 0) arr[i] = { ...arr[i], ...item, id };
  else arr.unshift({ ...item, id } as { id: string });
  (c as unknown as Record<string, unknown>)[type] = arr;
  await save(c);
  return c;
}

export async function remove(type: Coleccion, id: string) {
  const c = await getContent();
  const arr = ((c[type] as Array<{ id: string }>) || []).filter((x) => x.id !== id);
  (c as unknown as Record<string, unknown>)[type] = arr;
  await save(c);
  return c;
}

export async function updateInfo(info: Partial<SiteInfo>) {
  const c = await getContent();
  c.info = { ...c.info, ...info };
  await save(c);
  return c;
}
