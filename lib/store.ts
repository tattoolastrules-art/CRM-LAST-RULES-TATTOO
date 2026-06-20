// Capa de almacenamiento dual: Neon/Postgres si hay DATABASE_URL, si no archivo JSON.
// Cada "key" (content, users) se guarda como un blob JSONB en la tabla app_data,
// o como data/<key>.json en disco. Misma API en ambos modos.

import { promises as fs } from "fs";
import path from "path";

const url = process.env.DATABASE_URL;

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>;
let sqlPromise: Promise<Sql> | null = null;

async function getSql(): Promise<Sql> {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      const { neon } = await import("@neondatabase/serverless");
      const s = neon(url!) as unknown as Sql;
      await s`CREATE TABLE IF NOT EXISTS app_data (key text PRIMARY KEY, value jsonb NOT NULL)`;
      return s;
    })();
  }
  return sqlPromise;
}

function fileFor(key: string) {
  return path.join(process.cwd(), "data", key + ".json");
}
async function saveFile(key: string, value: unknown) {
  const f = fileFor(key);
  await fs.mkdir(path.dirname(f), { recursive: true });
  await fs.writeFile(f, JSON.stringify(value, null, 2), "utf8");
}

export async function loadJSON<T>(key: string, seed: T): Promise<T> {
  if (url) {
    const s = await getSql();
    const rows = await s`SELECT value FROM app_data WHERE key = ${key}`;
    if (rows.length) return rows[0].value as T;
    await s`INSERT INTO app_data (key, value) VALUES (${key}, ${JSON.stringify(seed)}::jsonb) ON CONFLICT (key) DO NOTHING`;
    return seed;
  }
  try {
    return JSON.parse(await fs.readFile(fileFor(key), "utf8")) as T;
  } catch {
    await saveFile(key, seed);
    return seed;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  if (url) {
    const s = await getSql();
    await s`INSERT INTO app_data (key, value) VALUES (${key}, ${JSON.stringify(value)}::jsonb)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
    return;
  }
  await saveFile(key, value);
}

export const usingNeon = !!url;
