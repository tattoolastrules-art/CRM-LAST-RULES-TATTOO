import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getFlowOverrides, setFlowOverride } from "@/lib/flow-overrides";
import { getCustomFlows, saveCustomFlow, deleteCustomFlow } from "@/lib/custom-flows";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await cookies();
  if (!(await verifySession(c.get("lr_session")?.value)))
    return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json({ overrides: await getFlowOverrides(), custom: await getCustomFlows() });
}

export async function POST(req: Request) {
  const c = await cookies();
  const s = await verifySession(c.get("lr_session")?.value);
  if (!s || s.role !== "admin")
    return Response.json({ error: "Solo administradores" }, { status: 403 });
  const b = await req.json();

  // Flujos creados con el asistente guiado
  if (b.action === "custom-save" && b.flow) {
    try {
      return Response.json({ custom: await saveCustomFlow(b.flow) });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  }
  if (b.action === "custom-delete" && b.id) {
    return Response.json({ custom: await deleteCustomFlow(String(b.id)) });
  }

  // Edición del texto de un nodo (flujos F1–F22)
  if (!b.flowId || !b.nodeId || typeof b.text !== "string")
    return Response.json({ error: "datos inválidos" }, { status: 400 });
  return Response.json({ overrides: await setFlowOverride(b.flowId, b.nodeId, b.text) });
}
