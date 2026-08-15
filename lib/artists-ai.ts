// Conocimiento de los TATUADORES para la IA (Ana/NOVA).
// Se arma desde el contenido del sitio (SiteAdmin → Tatuadores): alias, estilos,
// bio y el "estilo aprendido" que la IA destila de las fotos de cada artista
// (botón "Entrenar IA" — Alejandro sube 3–6 fotos por tatuador y Claude las
// analiza una sola vez; el resultado queda guardado y no vuelve a gastar visión).

import { getContent } from "./content";

export async function artistsBlock(): Promise<string> {
  const c = await getContent().catch(() => null);
  if (!c?.tatuadores?.length) return "";
  const activos = c.tatuadores.filter((t) => t.activo);
  if (!activos.length) return "";

  const lineas = activos.map((t) => {
    let linea = `- ${t.alias || t.nombre}${t.instagram ? ` (${t.instagram})` : ""}: ${(t.estilos || []).join(", ")}.`;
    if (t.bio) linea += ` ${t.bio}`;
    if (t.estiloIA) linea += ` SU ESTILO (aprendido de sus trabajos): ${t.estiloIA}`;
    return linea;
  });

  return [
    "TATUADORES DEL ESTUDIO (información pública del sitio web — puedes hablar de ellos, sus técnicas y estilos):",
    ...lineas,
    "Usa este conocimiento para orientar: si la idea del cliente encaja con un estilo, menciona con naturalidad que el estudio tiene un artista especialista en eso. El cliente NO elige tatuador: el estudio asigna al artista cuyo estilo mejor encaja según la idea y la agenda. Nunca prometas que una persona específica lo tatuará ni des datos personales del equipo.",
  ].join("\n");
}
