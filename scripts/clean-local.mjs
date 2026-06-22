// Limpia archivos de trabajo locales (conserva videos-input y el binario ffmpeg).
import { rm, stat } from "node:fs/promises";

async function sizeMB(p) {
  try {
    const { execSync } = await import("node:child_process");
    void execSync; // no-op
  } catch {}
  return null;
}
void sizeMB;

const targets = ["media-out", "tools/ffmpeg.zip"];
for (const t of targets) {
  try {
    await stat(t);
    await rm(t, { recursive: true, force: true });
    console.log("limpiado:", t);
  } catch (e) {
    console.log("omitido:", t, "-", e.code || e.message);
  }
}
