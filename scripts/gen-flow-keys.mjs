// Genera el par de llaves RSA para el endpoint cifrado de WhatsApp Flows.
// Uso: node scripts/gen-flow-keys.mjs
// La llave privada va en la variable de entorno FLOW_PRIVATE_KEY (Vercel, NO en el repo).
// La llave pública se sube a Meta con scripts/register-flow-key.mjs.
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

mkdirSync(".keys", { recursive: true });
writeFileSync(".keys/flow_private.pem", privateKey);
writeFileSync(".keys/flow_public.pem", publicKey);
console.log("Listo. Llaves en .keys/ (ignoradas por git, NO las subas).");
console.log("Siguiente paso: node scripts/register-flow-key.mjs");
