import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSettings, saveSettings, type Settings } from "@/lib/settings";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await cookies();
  if (!(await verifySession(c.get("lr_session")?.value)))
    return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json(await getSettings());
}

export async function POST(req: Request) {
  const c = await cookies();
  const s = await verifySession(c.get("lr_session")?.value);
  if (!s || s.role !== "admin")
    return Response.json({ error: "Solo el administrador" }, { status: 403 });
  const b = await req.json();

  const patch: Partial<Settings> = {};
  if (typeof b.anovaAuto === "boolean") patch.anovaAuto = b.anovaAuto;
  if (typeof b.notifyPhone === "string") patch.notifyPhone = b.notifyPhone;

  // Los módulos solo los administra el dueño del sistema (Chato / PRODY-G)
  if (b.modules && typeof b.modules === "object") {
    if (!(await isOwnerEmail(s.email)))
      return Response.json({ error: "Los módulos solo los administra PRODY-G" }, { status: 403 });
    patch.modules = b.modules;
  }

  return Response.json(await saveSettings(patch));
}
