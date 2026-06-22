// Sube las 4 escenas de fotogramas al cPanel por FTPS, archivo por archivo.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { Client } from "basic-ftp";

const env = {};
for (const l of (await readFile(".cpanel.env", "utf8")).split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const jobs = [
  ["media-out/frames-main", "/assets/FRAMES/main"],
  ["media-out/frames-premios", "/assets/FRAMES/premios"],
  ["media-out/frames-deer", "/assets/FRAMES/deer"],
  ["media-out/frames-art", "/assets/FRAMES/art"],
];

const c = new Client(60000);
try {
  await c.access({
    host: env.FTP_HOST, user: env.FTP_USER, password: env.FTP_PASS,
    port: Number(env.FTP_PORT) || 21, secure: true,
    secureOptions: { rejectUnauthorized: false },
  });
  for (const [ldir, rdir] of jobs) {
    const files = (await readdir(ldir)).filter((f) => f.endsWith(".jpg")).sort();
    await c.ensureDir(rdir);
    let i = 0;
    for (const f of files) {
      await c.uploadFrom(path.join(ldir, f), f);
      if (++i % 25 === 0) console.log(rdir, i, "/", files.length);
    }
    console.log(rdir, "OK", files.length);
  }
  console.log("TODO subido");
} catch (e) {
  console.log("ERROR:", e.message, e.code || "");
} finally {
  c.close();
}
