import {
  isBaileysWorkerConfigured,
  sendViaBaileysWorker,
} from '@/lib/whatsapp/providers/baileys-api';
import { isTwilioConfigured, sendViaTwilio } from '@/lib/whatsapp/providers/twilio';

export type WhatsappProvider = 'baileys' | 'twilio' | 'auto' | 'none';

function resolveProvider(): WhatsappProvider {
  const raw = (process.env.WHATSAPP_PROVIDER || 'auto').trim().toLowerCase();
  if (raw === 'baileys' || raw === 'twilio' || raw === 'none') return raw;
  return 'auto';
}

/**
 * Envía WhatsApp al teléfono del usuario (mismos eventos que correo cuando aplica).
 * Prioridad en auto: Baileys worker → Twilio.
 */
export async function enviarWhatsapp(
  telefono: string | null | undefined,
  mensaje: string,
): Promise<void> {
  const provider = resolveProvider();
  if (provider === 'none' || !mensaje.trim()) return;

  try {
    if (provider === 'baileys') {
      await sendViaBaileysWorker(telefono, mensaje);
      return;
    }

    if (provider === 'twilio') {
      await sendViaTwilio(telefono, mensaje);
      return;
    }

    // auto
    if (isBaileysWorkerConfigured()) {
      const ok = await sendViaBaileysWorker(telefono, mensaje).catch(() => false);
      if (ok) return;
    }

    if (isTwilioConfigured()) {
      await sendViaTwilio(telefono, mensaje);
    }
  } catch (error) {
    console.error('[enviarWhatsapp]', (error as Error).message);
  }
}
