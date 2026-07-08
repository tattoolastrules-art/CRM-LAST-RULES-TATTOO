import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getFlowOverrides, setFlowOverride } from "@/lib/flow-overrides";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await cookies();
  if (!(await verifySession(c.get("lr_session")?.value)))
    return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json({ overrides: await getFlowOverrides() });
}

export async function POST(req: Request) {
  const c = await cookies();
  const s = await verifySession(c.get("lr_session")?.value);
  if (!s || s.role !== "admin")
    return Response.json({ error: "Solo administradores" }, { status: 403 });
  const b = await req.json();
  if (!b.flowId || !b.nodeId || typeof b.text !== "string")
    return Response.json({ error: "datos inválidos" }, { status: 400 });
  return Response.json({ overrides: await setFlowOverride(b.flowId, b.nodeId, b.text) });
}
