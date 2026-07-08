import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { addPushSub, removePushSub, pushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null, configured: pushConfigured() });
}

export async function POST(req: Request) {
  const c = await cookies();
  if (!(await verifySession(c.get("lr_session")?.value)))
    return Response.json({ error: "no_autorizado" }, { status: 403 });
  const b = await req.json();
  if (b.action === "subscribe" && b.sub) { await addPushSub(b.sub); return Response.json({ ok: true }); }
  if (b.action === "unsubscribe" && b.endpoint) { await removePushSub(b.endpoint); return Response.json({ ok: true }); }
  return Response.json({ error: "acción inválida" }, { status: 400 });
}
