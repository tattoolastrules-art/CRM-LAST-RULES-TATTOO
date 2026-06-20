import { cookies } from "next/headers";
import { refresh } from "@/lib/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CAL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

async function accessToken(): Promise<string | null> {
  const c = await cookies();
  const at = c.get("g_at")?.value;
  if (at) return at;
  const rt = c.get("g_rt")?.value;
  if (rt) {
    const t = await refresh(rt);
    if (t.access_token) return t.access_token;
  }
  return null;
}

export async function GET() {
  const at = await accessToken();
  if (!at) return Response.json({ error: "no_conectado" }, { status: 401 });

  const timeMin = new Date();
  timeMin.setDate(timeMin.getDate() - 2);
  const p = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: timeMin.toISOString(),
    maxResults: "50",
  });
  const res = await fetch(`${CAL}?${p.toString()}`, {
    headers: { Authorization: `Bearer ${at}` },
  });
  const data = await res.json();
  if (!res.ok) {
    return Response.json({ error: data.error?.message || "calendar_error" }, { status: res.status });
  }
  return Response.json({ items: data.items ?? [] });
}

export async function POST(req: Request) {
  const at = await accessToken();
  if (!at) return Response.json({ error: "no_conectado" }, { status: 401 });

  const body = await req.json();
  const res = await fetch(CAL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${at}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    return Response.json({ error: data.error?.message || "calendar_error" }, { status: res.status });
  }
  return Response.json({ event: data });
}
