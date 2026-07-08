import { runFollowups } from "@/lib/followups";

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
  return Response.json({ ok: true, ...res, at: new Date().toISOString() });
}
