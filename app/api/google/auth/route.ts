import { NextResponse } from "next/server";
import { authUrl, hasCreds } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasCreds()) {
    return NextResponse.json(
      { error: "Falta GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET en .env.local" },
      { status: 400 },
    );
  }
  return NextResponse.redirect(authUrl());
}
