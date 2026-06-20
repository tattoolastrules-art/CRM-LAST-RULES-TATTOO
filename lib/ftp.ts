// Publicación por FTP al sitio en vivo (lastrulestattoo.com).
// Lee credenciales de .cpanel.env. Usa curl para no agregar dependencias
// y para no exponer el password en argumentos (va en un config temporal).

import { promises as fs } from "fs";
import { spawn } from "child_process";
import os from "os";
import path from "path";

interface FtpCfg { host: string; user: string; pass: string; port: string }

export async function readFtpCfg(): Promise<FtpCfg | null> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".cpanel.env"), "utf8");
    const cfg: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
      if (m) cfg[m[1]] = m[2].trim();
    }
    if (!cfg.FTP_HOST || !cfg.FTP_USER || !cfg.FTP_PASS) return null;
    return { host: cfg.FTP_HOST, user: cfg.FTP_USER, pass: cfg.FTP_PASS, port: cfg.FTP_PORT || "21" };
  } catch {
    return null;
  }
}

export async function uploadFile(localPath: string, remotePath: string): Promise<void> {
  const cfg = await readFtpCfg();
  if (!cfg) throw new Error("Faltan credenciales FTP en .cpanel.env");
  const tmp = path.join(os.tmpdir(), "lr_ftp_" + Date.now() + ".cfg");
  await fs.writeFile(tmp, `user = "${cfg.user}:${cfg.pass}"\n`, "utf8");
  const url = `ftp://${cfg.host}:${cfg.port}/${remotePath.replace(/^\/+/, "")}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const c = spawn("curl", ["-s", "-S", "--ssl", "-k", "--ftp-create-dirs", "--config", tmp, "-T", localPath, url]);
      let err = "";
      c.stderr.on("data", (d) => (err += d.toString()));
      c.on("close", (code) => (code === 0 ? resolve() : reject(new Error(err || "curl exit " + code))));
      c.on("error", reject);
    });
  } finally {
    await fs.unlink(tmp).catch(() => {});
  }
}
