import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getUsers, upsertUser, deleteUser, setPassword, publicUser } from "@/lib/users";
import { isOwnerEmail, OWNER_ID } from "@/lib/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function session() {
  const c = await cookies();
  return verifySession(c.get("lr_session")?.value);
}

export async function GET() {
  const s = await session();
  if (!s || s.role !== "admin") return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json({ users: (await getUsers()).map(publicUser) });
}

export async function POST(req: Request) {
  const s = await session();
  if (!s || s.role !== "admin") return Response.json({ error: "no_autorizado" }, { status: 403 });
  const b = await req.json();

  // El usuario dueño (Chato / PRODY-G) es intocable para todos menos él mismo.
  const targetId = b.action === "upsert" ? b.item?.id : b.id;
  if (targetId === OWNER_ID && !(await isOwnerEmail(s.email))) {
    return Response.json({ error: "Este usuario solo lo administra PRODY-G" }, { status: 403 });
  }

  if (b.action === "upsert") return Response.json({ users: (await upsertUser(b.item)).map(publicUser) });
  if (b.action === "setpw") return Response.json({ users: (await setPassword(b.id, b.password)).map(publicUser) });
  if (b.action === "delete") return Response.json({ users: (await deleteUser(b.id)).map(publicUser) });
  return Response.json({ error: "acción inválida" }, { status: 400 });
}
