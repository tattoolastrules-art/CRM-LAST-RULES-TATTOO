import { saveJSON } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Callback OAuth de TikTok Business: cuando el estudio autorice la app,
// TikTok redirige aquí con el auth_code. Se guarda en Neon (clave
// "tiktok_oauth") para hacer el intercambio por token cuando estén las llaves.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const code = u.searchParams.get("auth_code") || u.searchParams.get("code") || "";
  const state = u.searchParams.get("state") || "";
  if (code) {
    await saveJSON("tiktok_oauth", { code, state, at: new Date().toISOString() }).catch(() => {});
  }
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Last Rules OS · TikTok</title>
  <style>body{font-family:system-ui;background:#0f1522;color:#f0ebe1;display:grid;place-items:center;height:100vh;margin:0}
  .card{text-align:center;padding:40px;border:1px solid rgba(197,160,89,.3);border-radius:16px}
  .gold{color:#c5a059}</style></head>
  <body><div class="card"><h2 class="gold">🖤 LAST RULES OS</h2>
  <p>${code ? "Autorización de TikTok recibida ✅<br>Ya puedes cerrar esta pestaña." : "No llegó código de autorización — intenta de nuevo desde TikTok."}</p>
  </div></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
