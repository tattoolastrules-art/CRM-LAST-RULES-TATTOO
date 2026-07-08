import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getCitas, upsertCita, removeCita } from "@/lib/citas";
import { notifyStudio } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSession() {
  const c = await cookies();
  return verifySession(c.get("lr_session")?.value);
}

export async function GET() {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json({ citas: await getCitas() });
}

export async function POST(req: Request) {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  const b = await req.json();
  if (b.action === "upsert" && b.item) {
    const esNueva = !b.item.id;
    const citas = await upsertCita(b.item);
    if (esNueva) {
      const c = b.item;
      notifyStudio(`📅 NUEVA CITA (manual)\n${c.coleccionista || "?"}${c.pieza ? " · " + c.pieza : ""}\n🗓 ${c.fecha} ${c.start}:00 (${c.durHours || 1}h)\n${c.tipo === "asesoria" ? "Asesoría" : "Sesión"}${c.abono ? " · abono ✓" : ""}`).catch(() => {});
    }
    return Response.json({ citas });
  }
  if (b.action === "delete" && b.id) return Response.json({ citas: await removeCita(b.id) });
  return Response.json({ error: "acción inválida" }, { status: 400 });
}
