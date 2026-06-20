import { NextResponse } from "next/server";
import { exchangeCode } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?gcal=error", url.origin));
  }

  try {
    const tokens = await exchangeCode(code);
    if (tokens.error || !tokens.access_token) {
      return NextResponse.redirect(new URL("/?gcal=error", url.origin));
    }
    const res = NextResponse.redirect(new URL("/?gcal=connected", url.origin));
    res.cookies.set("g_at", tokens.access_token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: tokens.expires_in ?? 3600,
      path: "/",
    });
    if (tokens.refresh_token) {
      res.cookies.set("g_rt", tokens.refresh_token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 60, // 60 días
        path: "/",
      });
    }
    return res;
  } catch {
    return NextResponse.redirect(new URL("/?gcal=error", url.origin));
  }
}
