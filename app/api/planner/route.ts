import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { verifySession } from "@/lib/auth";
import { loadJSON, saveJSON } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface Campaign {
  id: string; titulo: string; canal: string; fecha: string; nota: string; col: string;
}

async function requireSession() {
  const c = await cookies();
  return verifySession(c.get("lr_session")?.value);
}

export async function GET() {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json({ items: await loadJSON<Campaign[]>("planner", []) });
}

export async function POST(req: Request) {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  const b = await req.json();
  let items = await loadJSON<Campaign[]>("planner", []);

  if (b.action === "upsert" && b.item) {
    const id = b.item.id || randomUUID().slice(0, 8);
    const i = items.findIndex((x) => x.id === id);
    const clean: Campaign = {
      id,
      titulo: String(b.item.titulo || "").slice(0, 160),
      canal: String(b.item.canal || "otro").slice(0, 20),
      fecha: String(b.item.fecha || "").slice(0, 10),
      nota: String(b.item.nota || "").slice(0, 800),
      col: String(b.item.col || "ideas").slice(0, 20),
    };
    if (i >= 0) items[i] = { ...items[i], ...clean };
    else items.unshift(clean);
  } else if (b.action === "delete" && b.id) {
    items = items.filter((x) => x.id !== b.id);
  } else if (b.action === "move" && b.id && b.col) {
    const it = items.find((x) => x.id === b.id);
    if (it) it.col = String(b.col).slice(0, 20);
  } else {
    return Response.json({ error: "acción inválida" }, { status: 400 });
  }

  await saveJSON("planner", items.slice(0, 300));
  return Response.json({ items });
}
