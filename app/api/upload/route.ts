import path from "path";
import os from "os";
import { promises as fs } from "fs";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";
import { uploadFile } from "@/lib/ftp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOLDERS: Record<string, string> = {
  tatuadores: "TATUADORES",
  publicaciones: "TATTOO",
  noticias: "NOTICIAS",
  info: "PORTADA",
  premios: "PREMIOS",
};

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  const c = await cookies();
  const s = await verifySession(c.get("lr_session")?.value);
  if (!s || s.role !== "admin") {
    return Response.json({ error: "Solo el administrador puede subir fotos" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const type = String(form.get("type") || "");
  if (!file) return Response.json({ error: "Sin archivo" }, { status: 400 });

  const folder = FOLDERS[type] || "MEDIA";
  const base = slug((file.name || "foto").replace(/\.[^.]+$/, "")) || "foto";
  const name = base + "-" + Date.now().toString(36) + ".jpg";
  const rel = "assets/" + folder + "/" + name;

  const buf = Buffer.from(await file.arrayBuffer());
  const tmp = path.join(os.tmpdir(), name);
  await fs.writeFile(tmp, buf);
  // Espejo local best-effort (en serverless el FS es de solo lectura)
  try {
    const localDir = path.join(process.cwd(), "site", "assets", folder);
    await fs.mkdir(localDir, { recursive: true });
    await fs.writeFile(path.join(localDir, name), buf);
  } catch {
    /* ignora si no se puede escribir local */
  }
  try {
    await uploadFile(tmp, rel);
  } catch (e) {
    return Response.json({ error: "Falló el FTP: " + (e as Error).message, path: rel }, { status: 500 });
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
  return Response.json({ path: rel });
}
