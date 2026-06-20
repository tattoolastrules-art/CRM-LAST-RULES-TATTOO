// Publicación por FTP al sitio en vivo (lastrulestattoo.com).
// Usa basic-ftp (cliente Node puro) → funciona también en serverless (Vercel).
// Credenciales: variables de entorno FTP_* (Vercel) o, en local, .cpanel.env.

import { promises as fs } from "fs";
import path from "path";
import { Client } from "basic-ftp";

interface FtpCfg { host: string; user: string; pass: string; port: number }

export async function readFtpCfg(): Promise<FtpCfg | null> {
  const e = process.env;
  let host = e.FTP_HOST, user = e.FTP_USER, pass = e.FTP_PASS, port = e.FTP_PORT;
  if (!(host && user && pass)) {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), ".cpanel.env"), "utf8");
      const cfg: Record<string, string> = {};
      for (const line of raw.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
        if (m) cfg[m[1]] = m[2].trim();
      }
      host = host || cfg.FTP_HOST;
      user = user || cfg.FTP_USER;
      pass = pass || cfg.FTP_PASS;
      port = port || cfg.FTP_PORT;
    } catch {
      /* sin archivo local */
    }
  }
  if (!(host && user && pass)) return null;
  return { host, user, pass, port: Number(port) || 21 };
}

export async function uploadFile(localPath: string, remotePath: string): Promise<void> {
  const cfg = await readFtpCfg();
  if (!cfg) throw new Error("Faltan credenciales FTP (.cpanel.env o variables FTP_*)");

  const client = new Client(30000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: cfg.host,
      user: cfg.user,
      password: cfg.pass,
      port: cfg.port,
      secure: true, // FTPS explícito (cPanel)
      secureOptions: { rejectUnauthorized: false }, // certificado autofirmado
    });
    const remote = remotePath.replace(/^\/+/, "");
    const slash = remote.lastIndexOf("/");
    if (slash > 0) {
      await client.ensureDir(remote.slice(0, slash));
      await client.uploadFrom(localPath, remote.slice(slash + 1));
    } else {
      await client.uploadFrom(localPath, remote);
    }
  } finally {
    client.close();
  }
}
