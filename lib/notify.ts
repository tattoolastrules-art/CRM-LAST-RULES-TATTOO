// Avisos importantes al WhatsApp del estudio (número configurable por el admin).
import { getSettings } from "./settings";
import { sendWhatsAppText, waConfigured } from "./whatsapp";

export async function notifyStudio(text: string): Promise<void> {
  try {
    if (!waConfigured()) return;
    const { notifyPhone } = await getSettings();
    if (!notifyPhone || notifyPhone.length < 8) return;
    const to = notifyPhone.startsWith("57") ? notifyPhone : "57" + notifyPhone;
    await sendWhatsAppText(to, "🔔 LAST RULES OS\n" + text.slice(0, 900));
  } catch {
    /* best effort */
  }
}
