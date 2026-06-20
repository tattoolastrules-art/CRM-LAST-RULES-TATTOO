import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { cookies } from "next/headers";
import { getContent } from "@/lib/content";
import { uploadFile, readFtpCfg } from "@/lib/ftp";
import { verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ configured: !!(await readFtpCfg()) });
}

export async function POST() {
  const c = await cookies();
  const s = await verifySession(c.get("lr_session")?.value);
  if (!s || s.role !== "admin")
    return Response.json({ error: "Solo el administrador puede publicar" }, { status: 403 });
  const cfg = await readFtpCfg();
  if (!cfg) return Response.json({ error: "Falta .cpanel.env (FTP)" }, { status: 400 });
  const content = await getContent();
  const tmp = path.join(os.tmpdir(), "lr_content_" + Date.now() + ".json");
  await fs.writeFile(tmp, JSON.stringify(content));
  try {
    await uploadFile(tmp, "data/content.json");
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}
