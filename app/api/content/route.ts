import { cookies } from "next/headers";
import { getContent, upsert, remove, updateInfo, type Coleccion } from "@/lib/content";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getContent());
}

export async function POST(req: Request) {
  const c = await cookies();
  if (!(await verifySession(c.get("lr_session")?.value)))
    return Response.json({ error: "no_autorizado" }, { status: 403 });
  const b = await req.json();
  if (b.action === "upsert") return Response.json(await upsert(b.type as Coleccion, b.item));
  if (b.action === "delete") return Response.json(await remove(b.type as Coleccion, b.id));
  if (b.action === "info") return Response.json(await updateInfo(b.info));
  return Response.json({ error: "acción inválida" }, { status: 400 });
}
