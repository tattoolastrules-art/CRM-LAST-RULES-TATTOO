// Usuarios del sistema (login + roles). Almacén JSON data/users.json.
// Roles: "admin" (Chato — control total) · "artista" (Alejandro, José).
// Migrable a Neon después.

import crypto from "crypto";
import { hashPassword } from "./auth";
import { loadJSON, saveJSON } from "./store";

export type Role = "admin" | "artista";
export interface User {
  id: string; email: string; name: string; role: Role; passHash: string; activo: boolean;
}

// Sin contraseña al inicio: cada quien la define (el admin en el primer acceso,
// y luego el admin asigna las de los artistas).
const SEED: User[] = [
  { id: "chato", email: "chato@lastrulestattoo.com", name: "Chato (PRODY-G)", role: "admin", passHash: "", activo: true },
  { id: "alejandro", email: "alejandro@lastrulestattoo.com", name: "Alejandro Martín", role: "admin", passHash: "", activo: true },
  { id: "jose", email: "jose@lastrulestattoo.com", name: "José Méndez", role: "artista", passHash: "", activo: true },
];

function save(u: User[]) {
  return saveJSON("users", u);
}

export async function getUsers(): Promise<User[]> {
  return loadJSON("users", SEED);
}

export async function findByEmail(email: string): Promise<User | undefined> {
  const e = (email || "").trim().toLowerCase();
  return (await getUsers()).find((u) => u.email.toLowerCase() === e);
}

export async function upsertUser(item: Partial<User> & { password?: string }) {
  const users = await getUsers();
  const id = item.id || crypto.randomBytes(4).toString("hex");
  const i = users.findIndex((u) => u.id === id);
  const passHash = item.password ? hashPassword(item.password) : undefined;
  const clean = { ...item };
  delete (clean as { password?: string }).password;
  if (i >= 0) {
    users[i] = { ...users[i], ...clean, id, ...(passHash ? { passHash } : {}) } as User;
  } else {
    users.unshift({
      id, email: item.email || "", name: item.name || "",
      role: (item.role as Role) || "artista", passHash: passHash || "", activo: item.activo ?? true,
    });
  }
  await save(users);
  return users;
}

export async function deleteUser(id: string) {
  const users = (await getUsers()).filter((u) => u.id !== id);
  await save(users);
  return users;
}

export async function setPassword(id: string, password: string) {
  const users = await getUsers();
  const u = users.find((x) => x.id === id);
  if (u) { u.passHash = hashPassword(password); await save(users); }
  return users;
}

export function publicUser(u: User) {
  return { id: u.id, email: u.email, name: u.name, role: u.role, activo: u.activo, hasPassword: !!u.passHash };
}
