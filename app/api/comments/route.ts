import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { getComments, patchComment } from "@/lib/comments";
import { replyComment, likeComment, hideComment } from "@/lib/meta-send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSession() {
  const c = await cookies();
  return verifySession(c.get("lr_session")?.value);
}

export async function GET() {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  return Response.json({ comments: await getComments() });
}

export async function POST(req: Request) {
  if (!(await requireSession())) return Response.json({ error: "no_autorizado" }, { status: 403 });
  const b = await req.json();
  const id = String(b.id || "");
  const all = await getComments();
  const c = all.find((x) => x.id === id);
  if (!c) return Response.json({ error: "comentario no encontrado" }, { status: 404 });

  try {
    if (b.action === "reply" && b.text) {
      await replyComment(c.id, c.platform, String(b.text));
      await patchComment(id, { replied: { text: String(b.text).slice(0, 900), at: new Date().toISOString() } });
    } else if (b.action === "like") {
      if (c.platform !== "facebook") {
        return Response.json({ error: "Instagram no permite dar like a comentarios por API — solo desde la app de IG" }, { status: 400 });
      }
      await likeComment(c.id);
      await patchComment(id, { liked: true });
    } else if (b.action === "hide") {
      await hideComment(c.id, c.platform, b.hide !== false);
      await patchComment(id, { hidden: b.hide !== false });
    } else {
      return Response.json({ error: "acción inválida" }, { status: 400 });
    }
    return Response.json({ ok: true, comments: await getComments() });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
