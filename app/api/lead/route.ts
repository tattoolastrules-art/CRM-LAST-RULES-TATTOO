import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getLeads, addLead, updateLead, removeLead } from "@/lib/leads";
import { pushAll } from "@/lib/push";
import { notifyStudio } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El formulario vive en lastrulestattoo.com y postea a app.lastrulestattoo.com → CORS.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {}
  if (!String(body.nombre || "").trim() && !String(body.contacto || "").trim()) {
    return Response.json({ error: "Faltan datos" }, { status: 400, headers: CORS });
  }
  const lead = await addLead(body);
  pushAll("🌐 Nueva reserva web", `${lead.nombre} · ${lead.servicio || "consulta"}`, "/os").catch(() => {});
  notifyStudio(`🌐 Nueva reserva desde la web:\n${lead.nombre}\n📱 ${lead.contacto}\n${lead.servicio}${lead.idea ? "\n“" + lead.idea + "”" : ""}`).catch(() => {});
  return Response.json({ ok: true, id: lead.id }, { headers: CORS });
}

async function requireSession() {
  const c = await cookies();
  return verifySession(c.get("lr_session")?.value);
}

export async function GET() {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json({ leads: await getLeads() });
}

export async function PATCH(req: Request) {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  const b = await req.json();
  if (b.action === "update") {
    const leads = await updateLead(b.id, b.patch);
    // Aviso al estudio cuando queda una cita agendada
    if (b.patch?.estado === "agendado") {
      const l = leads.find((x) => x.id === b.id);
      if (l) {
        const fecha = l.fechaCita ? new Date(l.fechaCita).toLocaleString("es-CO", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "por definir";
        notifyStudio(`📅 CITA AGENDADA\n${l.nombre}\n📱 ${l.contacto}\n🗓 ${fecha}${l.maestro ? "\n🎨 " + l.maestro : ""}${l.servicio ? "\n" + l.servicio : ""}`).catch(() => {});
      }
    }
    return Response.json({ leads });
  }
  if (b.action === "delete") return Response.json({ leads: await removeLead(b.id) });
  return Response.json({ error: "acción inválida" }, { status: 400 });
}
