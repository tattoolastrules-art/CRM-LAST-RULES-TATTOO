import { cookies } from "next/headers";
import { hasCreds } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await cookies();
  const connected = !!(c.get("g_at") || c.get("g_rt"));
  return Response.json({ connected, configured: hasCreds() });
}
