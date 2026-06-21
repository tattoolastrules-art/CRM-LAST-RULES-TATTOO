// Borra del servidor los 3 PNG gigantes huérfanos (ya no referenciados).
// Hay backup local en site/assets/TATUADORES y en site-backup-*.zip.
import { readFile } from "node:fs/promises";
import { Client } from "basic-ftp";

const env = {};
for (const l of (await readFile(".cpanel.env", "utf8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const files = [
  "assets/TATUADORES/ALEJO_1.png",
  "assets/TATUADORES/LAURA_1.png",
  "assets/TATUADORES/YAMI_3.png",
];

const c = new Client(25000);
try {
  await c.access({
    host: env.FTP_HOST, user: env.FTP_USER, password: env.FTP_PASS,
    port: Number(env.FTP_PORT) || 21, secure: true,
    secureOptions: { rejectUnauthorized: false },
  });
  for (const f of files) {
    try { await c.remove(f); console.log("borrado:", f); }
    catch (e) { console.log("no se pudo:", f, "-", e.message); }
  }
} finally {
  c.close();
}
