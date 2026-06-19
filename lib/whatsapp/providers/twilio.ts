import twilio from 'twilio';
import { normalizarTelefonoE164 } from '@/lib/whatsapp/normalize';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const _waFrom = process.env.WHATSAPP_FROM || '+525530776194';
const WHATSAPP_FROM = _waFrom.startsWith('whatsapp:')
  ? _waFrom
  : `whatsapp:${_waFrom.startsWith('+') ? _waFrom : `+${_waFrom.replace(/\D/g, '')}`}`;

const twilioClient =
  TWILIO_SID && TWILIO_TOKEN ? twilio(TWILIO_SID, TWILIO_TOKEN) : null;

export function isTwilioConfigured(): boolean {
  return Boolean(twilioClient);
}

export async function sendViaTwilio(
  telefono: string | null | undefined,
  mensaje: string,
): Promise<boolean> {
  if (!twilioClient || !mensaje.trim()) return false;

  const to = normalizarTelefonoE164(telefono);
  if (!to) return false;

  await twilioClient.messages.create({
    from: WHATSAPP_FROM,
    to: to.startsWith('+') ? `whatsapp:${to}` : `whatsapp:+${to}`,
    body: mensaje,
  });
  return true;
}
