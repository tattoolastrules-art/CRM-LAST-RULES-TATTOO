// Seguimiento automático: confirmación de cita, controles post-tatuaje y
// encuesta de satisfacción. Los días y mensajes los edita el admin (Alejandro);
// los valores por defecto son los recomendados por el sistema.
import { loadJSON, saveJSON } from "./store";
import { getLeads, updateLead, type Lead } from "./leads";
import { sendWhatsAppText, waConfigured } from "./whatsapp";
import { addConvoMsg } from "./convos";

export interface FollowStep { id: string; dias: number; msg: string }
export interface FollowConfig {
  confirmMsg: string;
  steps: FollowStep[];
  reviewLink: string;
}

// ★ = recomendado por el sistema (calidad de cicatrización + momento de reseña)
const DEFAULTS: FollowConfig = {
  confirmMsg:
    "¡Hola {nombre}! Te escribo de Last Rules 🖤 Mañana es tu cita en El Templo. Llega alimentad@, hidratad@ y con ropa cómoda. ¿Confirmas tu asistencia?",
  steps: [
    { id: "d1", dias: 1, msg: "¡Hola {nombre}! ¿Cómo amaneció tu Pieza? 🖤 Recuerda: jabón neutro 2 veces al día y crema sin fragancia en capa fina. Cualquier cosa rara, me escribes de una." },
    { id: "d4", dias: 4, msg: "¡Hola! ¿Cómo va la cicatrización? 🤍 Es normal que pique un poquito — no te rasques ni arranques las costritas. ¿Todo bien por allá?" },
    { id: "d10", dias: 10, msg: "¡{nombre}! Ya casi 2 semanas de tu Obra ✨ ¿Cómo la ves? Si quieres, mándame una foto y la revisamos. Recuerda: nada de sol ni piscina todavía." },
    { id: "d21", dias: 21, msg: "¿Cómo sigue tu Pieza? 🖤 A esta altura ya debe estar casi lista. Del 1 al 5, ¿qué tan feliz estás con el resultado?" },
    { id: "d30", dias: 30, msg: "¡Hola {nombre}! Tu Obra cumple un mes 👑 Recuerda que tienes tu retoque de cortesía si lo necesitas. ¿Cómo te ha ido? Del 1 al 5, ¿cómo calificas tu experiencia en Last Rules?" },
  ],
  reviewLink: "https://g.page/r/lastrulestattoo/review",
};

export async function getFollowConfig(): Promise<FollowConfig> {
  const c = await loadJSON<Partial<FollowConfig>>("followups", DEFAULTS);
  return {
    confirmMsg: c.confirmMsg || DEFAULTS.confirmMsg,
    steps: Array.isArray(c.steps) && c.steps.length ? (c.steps as FollowStep[]) : DEFAULTS.steps,
    reviewLink: c.reviewLink ?? DEFAULTS.reviewLink,
  };
}

export async function saveFollowConfig(patch: Partial<FollowConfig>): Promise<FollowConfig> {
  const cur = await getFollowConfig();
  const next: FollowConfig = {
    confirmMsg: (patch.confirmMsg ?? cur.confirmMsg).slice(0, 600),
    steps: (patch.steps ?? cur.steps).slice(0, 12).map((s, i) => ({
      id: s.id || "s" + i,
      dias: Math.max(0, Math.min(365, Number(s.dias) || 0)),
      msg: String(s.msg || "").slice(0, 600),
    })),
    reviewLink: (patch.reviewLink ?? cur.reviewLink).slice(0, 300),
  };
  await saveJSON("followups", next);
  return next;
}

function fill(msg: string, lead: Lead): string {
  return msg
    .replaceAll("{nombre}", (lead.nombre || "").split(" ")[0] || "")
    .replaceAll("{fecha}", lead.fechaCita ? new Date(lead.fechaCita).toLocaleString("es-CO", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "");
}

async function enviar(lead: Lead, msg: string): Promise<boolean> {
  const digits = (lead.contacto || "").replace(/\D/g, "");
  if (digits.length < 8) return false;
  const to = digits.startsWith("57") ? digits : "57" + digits;
  try {
    await sendWhatsAppText(to, msg);
    await addConvoMsg(to, lead.nombre, "ana", msg);
    return true;
  } catch {
    return false;
  }
}

// Corre una vez al día (Vercel Cron). Devuelve un resumen de lo enviado.
export async function runFollowups(): Promise<{ confirmaciones: number; seguimientos: number }> {
  if (!waConfigured()) return { confirmaciones: 0, seguimientos: 0 };
  const cfg = await getFollowConfig();
  const leads = await getLeads();
  const now = Date.now();
  let confirmaciones = 0;
  let seguimientos = 0;

  for (const lead of leads) {
    const seg: Record<string, string> = ((lead as unknown as { seguimientos?: Record<string, string> }).seguimientos) || {};

    // 1) Confirmación de cita: entre 30h y 2h antes de la cita
    if (lead.estado === "agendado" && lead.fechaCita && !seg.confirm) {
      const diff = new Date(lead.fechaCita).getTime() - now;
      if (diff > 2 * 3600e3 && diff < 30 * 3600e3) {
        if (await enviar(lead, fill(cfg.confirmMsg, lead))) {
          seg.confirm = new Date().toISOString();
          await updateLead(lead.id, { seguimientos: seg } as Partial<Lead>);
          confirmaciones++;
        }
      }
    }

    // 2) Post-tatuaje: pasos por días desde la sesión (estado cerrado)
    if (lead.estado === "cerrado") {
      const base = lead.fechaCita ? new Date(lead.fechaCita).getTime() : new Date(lead.fecha).getTime();
      const dias = Math.floor((now - base) / 86400e3);
      for (const step of cfg.steps) {
        // ventana de 2 días para no bombardear si el cron se salta un día
        if (dias >= step.dias && dias <= step.dias + 1 && !seg[step.id]) {
          if (await enviar(lead, fill(step.msg, lead))) {
            seg[step.id] = new Date().toISOString();
            await updateLead(lead.id, { seguimientos: seg } as Partial<Lead>);
            seguimientos++;
          }
          break; // máximo un mensaje de seguimiento por día por lead
        }
      }
    }
  }
  return { confirmaciones, seguimientos };
}
