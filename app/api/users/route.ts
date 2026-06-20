import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getUsers, upsertUser, deleteUser, setPassword, publicUser } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin() {
  const c = await cookies();
  const s = await verifySession(c.get("lr_session")?.value);
  return !!(s && s.role === "admin");
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json({ users: (await getUsers()).map(publicUser) });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  const b = await req.json();
  if (b.action === "upsert") return Response.json({ users: (await upsertUser(b.item)).map(publicUser) });
  if (b.action === "setpw") return Response.json({ users: (await setPassword(b.id, b.password)).map(publicUser) });
  if (b.action === "delete") return Response.json({ users: (await deleteUser(b.id)).map(publicUser) });
  return Response.json({ error: "acción inválida" }, { status: 400 });
}
