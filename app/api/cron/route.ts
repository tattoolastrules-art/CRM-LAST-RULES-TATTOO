import { runFollowups } from "@/lib/followups";
import { checkWindowAlerts } from "@/lib/convos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Lo dispara Vercel Cron (diario). Protegido con CRON_SECRET si está definido.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return new Response("Forbidden", { status: 403 });
  }
  const res = await runFollowups();
  const alertas24 = await checkWindowAlerts().catch(() => 0);
  return Response.json({ ok: true, ...res, alertas24, at: new Date().toISOString() });
}
