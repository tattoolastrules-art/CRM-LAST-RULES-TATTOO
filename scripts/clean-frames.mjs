// Elimina del servidor las carpetas de fotogramas que ya no se usan.
import { readFile } from "node:fs/promises";
import { Client } from "basic-ftp";

const env = {};
for (const l of (await readFile(".cpanel.env", "utf8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const dirs = [
  "/assets/FRAMES/premios",
  "/assets/FRAMES/deer",
  "/assets/FRAMES/art",
  "/assets/FRAMES/escena1",
  "/assets/FRAMES/escena2",
];

const c = new Client(60000);
try {
  await c.access({
    host: env.FTP_HOST, user: env.FTP_USER, password: env.FTP_PASS,
    port: Number(env.FTP_PORT) || 21, secure: true,
    secureOptions: { rejectUnauthorized: false },
  });
  for (const d of dirs) {
    try { await c.removeDir(d); console.log("limpiado:", d); }
    catch (e) { console.log("omitido:", d, "-", e.message); }
  }
} finally {
  c.close();
}
