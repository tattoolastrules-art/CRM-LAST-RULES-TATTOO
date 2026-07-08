import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";

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
  return Response.json(await saveSettings({ anovaAuto: !!b.anovaAuto }));
}
