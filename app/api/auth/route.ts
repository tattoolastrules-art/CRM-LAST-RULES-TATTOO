import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { findByEmail, setPassword } from "@/lib/users";
import { verifyPassword, signSession, verifySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEEK = 1000 * 60 * 60 * 24 * 7;

export async function GET() {
  const c = await cookies();
  const s = await verifySession(c.get("lr_session")?.value);
  if (!s) return NextResponse.json({ user: null });
  const { isOwnerEmail } = await import("@/lib/owner");
  const owner = await isOwnerEmail(s.email);
  return NextResponse.json({ user: { email: s.email, role: s.role, name: s.name, owner } });
}

export async function POST(req: Request) {
  const b = await req.json();

  if (b.action === "logout") {
    const r = NextResponse.json({ ok: true });
    r.cookies.delete("lr_session");
    return r;
  }

  // Primer acceso del admin: fija su contraseña si aún no tiene.
  if (b.action === "setup-admin") {
    const u = await findByEmail(b.email);
    if (!u || u.role !== "admin" || u.passHash) {
      return NextResponse.json({ error: "No disponible" }, { status: 400 });
    }
    if (!b.password || b.password.length < 6) {
      return NextResponse.json({ error: "Mínimo 6 caracteres" }, { status: 400 });
    }
    await setPassword(u.id, b.password);
  }

  const user = await findByEmail(b.email);
  if (!user || !user.activo) return NextResponse.json({ error: "Usuario no encontrado o inactivo" }, { status: 401 });
  if (!user.passHash) {
    return NextResponse.json(
      { error: "sin_contraseña", needsSetup: user.role === "admin" },
      { status: 401 },
    );
  }
  if (!verifyPassword(b.password || "", user.passHash)) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  const token = await signSession({ email: user.email, role: user.role, name: user.name, exp: Date.now() + WEEK });
  const r = NextResponse.json({ user: { email: user.email, role: user.role, name: user.name } });
  r.cookies.set("lr_session", token, { httpOnly: true, sameSite: "lax", maxAge: WEEK / 1000, path: "/" });
  return r;
}
