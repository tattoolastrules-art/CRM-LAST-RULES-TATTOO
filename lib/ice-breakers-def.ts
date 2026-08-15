// Parte PURA de las plantillas de bienvenida (sin almacenamiento): tipos,
// defaults, saneo y matching. Segura para el navegador; la persistencia
// (Neon/JSON) vive en ice-breakers.ts (solo servidor).

export interface IceBreaker {
  q: string; // la pregunta que ve el cliente (en WhatsApp: título corto del botón)
  a: string; // la respuesta predefinida de Ana
}

export interface IceBreakersConfig {
  instagram: IceBreaker[]; // máx 4 (límite de Meta)
  facebook: IceBreaker[]; // máx 4
  whatsapp: IceBreaker[]; // máx 3 botones (límite de WhatsApp), título máx 20
  waWelcome: string; // texto de bienvenida que acompaña los botones de WhatsApp
}

export const IB_DEFAULTS: IceBreakersConfig = {
  instagram: [
    {
      q: "¿Cuánto cuesta un tatuaje personalizado?",
      a: "¡Hola! 🖤 Cada tatuaje se cotiza a la medida: depende del diseño, la zona, el tamaño y el detalle. Cuéntame tu idea y un tatuador te da el valor exacto ✨ ¿Qué tienes en mente?",
    },
    {
      q: "¿Puedes compartir algunos de tus trabajos anteriores?",
      a: "¡Claro! 🤍 En @last_rules_tattoo está el portafolio completo: freehand, dark work, realismo, fine line y más. Dime qué estilo te llama y te muestro lo más parecido a tu idea 👑",
    },
    {
      q: "¿Tienes disponibilidad para hacer un tatuaje este mes?",
      a: "¡Sí! 🖤 La agenda se mueve rápido, pero apartamos tu cupo con un abono de $100.000 que se descuenta del total. ¿Te queda mejor entre semana o el fin de semana? ✨",
    },
    {
      q: "¿Dónde están ubicados?",
      a: "Estamos en Calle 52 # 25-14, Barrio Galerías, Bogotá 📍 Mar–Sáb de 11am a 8pm. ¿Te ayudo a agendar tu visita? 🖤",
    },
  ],
  facebook: [
    {
      q: "¿Cuánto cuesta un tatuaje personalizado?",
      a: "¡Hola! 🖤 Cada tatuaje se cotiza a la medida: depende del diseño, la zona, el tamaño y el detalle. Cuéntame tu idea y un tatuador te da el valor exacto ✨ ¿Qué tienes en mente?",
    },
    {
      q: "¿Puedes compartir algunos de tus trabajos anteriores?",
      a: "¡Claro! 🤍 En Instagram @last_rules_tattoo está el portafolio completo. Dime qué estilo te llama y te muestro lo más parecido a tu idea 👑",
    },
    {
      q: "¿Tienes disponibilidad para hacer un tatuaje este mes?",
      a: "¡Sí! 🖤 La agenda se mueve rápido, pero apartamos tu cupo con un abono de $100.000 que se descuenta del total. ¿Te queda mejor entre semana o el fin de semana? ✨",
    },
  ],
  whatsapp: [
    {
      q: "💰 Cotizar mi idea",
      a: "¡De una! 🖤 Cuéntame qué idea tienes, en qué zona del cuerpo y de qué tamaño aprox. Con eso un tatuador te cotiza a la medida ✨",
    },
    {
      q: "📸 Ver trabajos",
      a: "En Instagram @last_rules_tattoo está el portafolio completo 🤍 Dime qué estilo te llama (freehand, realismo, fine line…) y te oriento 👑",
    },
    {
      q: "📅 Agendar cita",
      a: "¡Perfecto! 🖤 Apartamos tu cupo con un abono de $100.000 que se descuenta del total. ¿Te queda mejor entre semana o el fin de semana?",
    },
  ],
  waWelcome: "¡Hola! Soy Ana, de Last Rules Tattoo 🖤 ¿En qué te ayudo hoy?",
};

const limpia = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
// Recorte que no parte un emoji a la mitad (slice corta por unidades UTF-16)
const limpiaGrafemas = (s: unknown, max: number) => Array.from(String(s ?? "").trim()).slice(0, max).join("");

export function saneIceBreakers(list: unknown, max: number, qMax: number): IceBreaker[] {
  return (Array.isArray(list) ? list : [])
    .map((x) => ({ q: limpiaGrafemas((x as IceBreaker)?.q, qMax), a: limpia((x as IceBreaker)?.a, 900) }))
    .filter((x) => x.q && x.a)
    .slice(0, max);
}

// Payload estable para los postbacks/botones: IB_<canal>_<índice>
export function ibPayload(canal: keyof Omit<IceBreakersConfig, "waWelcome">, i: number): string {
  return `IB_${canal}_${i}`;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Busca la respuesta predefinida: por payload del botón o por el texto de la pregunta.
// El payload guarda un ÍNDICE, y Meta conserva las burbujas viejas hasta republicar;
// por eso, si viene el texto de la pregunta tocada, debe COINCIDIR con la posición —
// si no coincide (el admin reordenó/borró sin republicar), se resuelve por texto.
export function findIceBreakerAnswer(cfg: IceBreakersConfig, payload?: string, texto?: string): string | null {
  const t = norm(texto || "");
  if (payload) {
    const m = /^IB_(instagram|facebook|whatsapp)_(\d+)$/.exec(payload);
    if (m) {
      const item = cfg[m[1] as "instagram" | "facebook" | "whatsapp"]?.[Number(m[2])];
      if (item && (!t || norm(item.q) === t)) return item.a;
    }
  }
  if (t.length >= 4) {
    for (const canal of ["instagram", "facebook", "whatsapp"] as const) {
      for (const item of cfg[canal]) {
        if (norm(item.q) === t) return item.a;
      }
    }
  }
  return null;
}
