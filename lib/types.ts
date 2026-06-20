// Tipos centrales del aplicativo Last Rules OS
// CRM + chat omnicanal + agenda

export type Channel = "whatsapp" | "instagram" | "facebook";

// Etapa del Coleccionista en el embudo (CRM de Alejandro)
export type Stage =
  | "nuevo" // primer contacto
  | "calificando" // dando idea/zona/tamaño
  | "cotizado" // un Maestro devolvió valor
  | "asesoria" // agendó asesoría gratis
  | "agendando" // eligiendo fecha
  | "abono" // pendiente/recibido abono
  | "cerrado" // sesión confirmada
  | "perdido"; // se enfrió / no concretó

export type Sender = "coleccionista" | "lana" | "maestro";

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  at: string; // ISO
}

export interface Contact {
  id: string;
  name: string;
  handle?: string; // @ para IG
  phone?: string; // para WhatsApp
  channel: Channel;
  city?: string;
  lang?: "es" | "en" | "de";
  avatarHue?: number; // para avatar de color
}

export type Outcome = "agendado" | "cerrado" | "seguimiento" | "perdido" | null;

export interface Conversation {
  id: string;
  contact: Contact;
  channel: Channel;
  stage: Stage;
  messages: Message[];
  tags: string[];
  idea?: string;
  zona?: string;
  tamano?: string;
  intent?: string; // resumen de intención detectada
  lastAt: string; // ISO del último mensaje
  unread?: boolean;
  outcome?: Outcome; // hacia dónde cerró/va
}

// Tatuador / Maestro (para la agenda)
export interface Maestro {
  id: string;
  name: string; // nombre artístico (nunca el real de cara al Coleccionista)
  styles: string[];
  calendarColor: string;
}

// Cita en la agenda (se sincroniza con Google Calendar en Fase 3)
export interface Appointment {
  id: string;
  conversationId: string;
  coleccionista: string;
  maestroId: string;
  start: string; // ISO
  end: string; // ISO
  type: "asesoria" | "sesion";
  abono: boolean;
  notes?: string;
}

export const STAGE_LABELS: Record<Stage, string> = {
  nuevo: "Nuevo",
  calificando: "Calificando",
  cotizado: "Cotizado",
  asesoria: "Asesoría",
  agendando: "Agendando",
  abono: "Abono",
  cerrado: "Cerrado",
  perdido: "Perdido",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
};
