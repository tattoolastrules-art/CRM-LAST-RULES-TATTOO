// Autenticación: hash de contraseñas (scrypt) + sesión firmada (HMAC en cookie).
// Sin dependencias externas. El secreto se genera y guarda en data/.authsecret.

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const SECRET_FILE = path.join(process.cwd(), "data", ".authsecret");

async function secret(): Promise<string> {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  try {
    return (await fs.readFile(SECRET_FILE, "utf8")).trim();
  } catch {
    const s = crypto.randomBytes(32).toString("hex");
    try {
      await fs.mkdir(path.dirname(SECRET_FILE), { recursive: true });
      await fs.writeFile(SECRET_FILE, s, "utf8");
    } catch {
      /* FS de solo lectura (serverless): usa AUTH_SECRET del entorno */
    }
    return s;
  }
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(pw, salt, 32).toString("hex");
  return salt + ":" + h;
}

export function verifyPassword(pw: string, stored: string): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, h] = stored.split(":");
  const calc = crypto.scryptSync(pw, salt, 32).toString("hex");
  const a = Buffer.from(h, "hex");
  const b = Buffer.from(calc, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface Session { email: string; role: string; name: string; exp: number }

export async function signSession(s: Session): Promise<string> {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  const sig = crypto.createHmac("sha256", await secret()).update(body).digest("base64url");
  return body + "." + sig;
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expect = crypto.createHmac("sha256", await secret()).update(body).digest("base64url");
  if (sig !== expect) return null;
  try {
    const s = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
    return s.exp < Date.now() ? null : s;
  } catch {
    return null;
  }
}
