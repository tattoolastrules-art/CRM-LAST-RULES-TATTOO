// Endpoint de intercambio de datos de WhatsApp Flows (formulario "Servicios").
// Meta llama aquí, cifrado, cada vez que el cliente avanza de pantalla dentro
// del Flow. La pantalla final (botón "Enviar") NO pasa por aquí: llega como
// mensaje normal (interactive.nfm_reply) al webhook de /api/meta/webhook.
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface FlowRequestBody {
  encrypted_flow_data: string;
  encrypted_aes_key: string;
  initial_vector: string;
}
interface DecryptedFlowRequest {
  version?: string;
  action: "ping" | "INIT" | "data_exchange" | "BACK" | string;
  screen?: string;
  data?: Record<string, unknown>;
  flow_token?: string;
}

function getPrivateKey(): crypto.KeyObject {
  let raw = (process.env.FLOW_PRIVATE_KEY || "").trim();
  // Si se pegó como base64 en una sola línea (evita que el hosting rompa los
  // saltos de línea del PEM), se decodifica antes de usarla.
  if (raw && !raw.includes("BEGIN")) {
    try { raw = Buffer.from(raw, "base64").toString("utf8"); } catch { /* se intenta tal cual abajo */ }
  }
  const pem = raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
  return crypto.createPrivateKey({
    key: pem,
    passphrase: process.env.FLOW_PRIVATE_KEY_PASSPHRASE || undefined,
  });
}

function decryptRequest(body: FlowRequestBody): { decrypted: DecryptedFlowRequest; aesKey: Buffer; iv: Buffer } {
  const privateKey = getPrivateKey();
  const aesKey = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
    Buffer.from(body.encrypted_aes_key, "base64"),
  );
  const iv = Buffer.from(body.initial_vector, "base64");
  const flowDataBuf = Buffer.from(body.encrypted_flow_data, "base64");
  const authTag = flowDataBuf.subarray(flowDataBuf.length - 16);
  const ciphertext = flowDataBuf.subarray(0, flowDataBuf.length - 16);
  const decipher = crypto.createDecipheriv("aes-128-gcm", aesKey, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return { decrypted: JSON.parse(decrypted.toString("utf8")) as DecryptedFlowRequest, aesKey, iv };
}

// La respuesta se cifra con la MISMA llave AES pero el IV invertido bit a bit (spec de Meta).
function encryptResponse(payload: unknown, aesKey: Buffer, iv: Buffer): string {
  const flippedIv = Buffer.alloc(iv.length);
  for (let i = 0; i < iv.length; i++) flippedIv[i] = ~iv[i] & 0xff;
  const cipher = crypto.createCipheriv("aes-128-gcm", aesKey, flippedIv);
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(json), cipher.final(), cipher.getAuthTag()]);
  return encrypted.toString("base64");
}

// Mapa: opción elegida en el menú -> id de la pantalla del Flow que le corresponde
const CATEGORIA_SCREEN: Record<string, string> = {
  cita: "CITA",
  idea: "IDEA",
  asesoria: "ASESORIA",
  cursos: "CURSOS",
  retoque: "RETOQUE",
  coverup: "COVERUP",
  bono: "BONO",
  faq: "FAQ",
};

export async function POST(req: Request) {
  let ctx: { decrypted: DecryptedFlowRequest; aesKey: Buffer; iv: Buffer };
  try {
    const body = (await req.json()) as FlowRequestBody;
    ctx = decryptRequest(body);
  } catch {
    // Firma/llave inválida o rotada: 421 le indica a Meta que debe re-obtener la llave pública
    return new Response(null, { status: 421 });
  }

  const { decrypted, aesKey, iv } = ctx;

  if (decrypted.action === "ping") {
    return new Response(encryptResponse({ data: { status: "active" } }, aesKey, iv), { status: 200 });
  }

  let nextScreen = "MENU";
  if (decrypted.action === "data_exchange" && decrypted.screen === "MENU") {
    const categoria = String(decrypted.data?.categoria || "");
    nextScreen = CATEGORIA_SCREEN[categoria] || "MENU";
  }
  // INIT y BACK (y cualquier otra acción no manejada) vuelven al menú principal

  return new Response(encryptResponse({ screen: nextScreen, data: {} }, aesKey, iv), {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
