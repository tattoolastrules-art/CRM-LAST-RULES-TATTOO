// Identidad de marca — LAST RULES TATTOO ("El Templo de la Piel")
// Fuente única de verdad visual y de tono para todo el aplicativo.

export const BRAND = {
  name: "LAST RULES TATTOO",
  tagline: "El Templo de la Piel",
  colors: {
    navy: "#0F1522", // fondo principal
    navySoft: "#161D2E",
    navyCard: "#1B2336",
    gold: "#C5A059", // acento
    goldSoft: "#D8BE86",
    bone: "#F0EBE1", // texto
    boneDim: "#A7A293",
    line: "#2A3346",
    whatsapp: "#25D366",
    instagram: "#E1306C",
    facebook: "#1877F2",
  },
  emojis: {
    allowed: ["🖤", "🤍", "✨", "👑", "🥇", "⚜️", "📜"],
    banned: ["👋", "🙌", "😊", "😉", "😐", "🔥", "❤️", "✅", "💰", "🟢"],
  },
  lexicon: {
    cliente: "Coleccionista",
    tatuaje: "Pieza / Obra",
    plantilla: "Composición Maestra",
    local: "El Templo",
    tatuadores: "Los Maestros",
  },
} as const;

export const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: BRAND.colors.whatsapp,
  instagram: BRAND.colors.instagram,
  facebook: BRAND.colors.facebook,
};

export const STAGE_COLOR: Record<string, string> = {
  nuevo: "#6B7794",
  calificando: "#5B8CB7",
  cotizado: "#C5A059",
  asesoria: "#8E7CC3",
  agendando: "#D8A24A",
  abono: "#E0A33E",
  cerrado: "#3FB37F",
  perdido: "#7A6A6A",
};
