// El "dueño" del sistema es Chato (PRODY-G, usuario id "chato").
// Solo él administra módulos y su propio usuario — nadie más puede tocarlo.
import { getUsers } from "./users";

export const OWNER_ID = "chato";

export async function isOwnerEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const owner = (await getUsers()).find((u) => u.id === OWNER_ID);
  return !!owner && owner.email.toLowerCase() === email.toLowerCase();
}
