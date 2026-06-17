import twilio from 'twilio';

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const _waFrom = process.env.WHATSAPP_FROM || '+525530776194';
const WHATSAPP_FROM = _waFrom.startsWith('whatsapp:')
  ? _waFrom
  : 'whatsapp:' +
    (_waFrom.startsWith('+') ? _waFrom : '+' + _waFrom.replace(/\D/g, ''));

const twilioClient =
  TWILIO_SID && TWILIO_TOKEN ? twilio(TWILIO_SID, TWILIO_TOKEN) : null;

export function normalizarTelefonoE164(telefono: string | null | undefined): string | null {
  if (!telefono || typeof telefono !== 'string') return null;
  const digits = telefono.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.length === 10) return '+52' + digits;
  if (digits.length === 12 && digits.startsWith('52')) return '+' + digits;
  if (digits.length === 11 && digits.startsWith('52')) return '+' + digits;
  if (digits.length >= 10) return '+52' + digits.slice(-10);
  return null;
}

export async function enviarWhatsapp(
  telefono: string | null | undefined,
  mensaje: string,
): Promise<void> {
  if (!twilioClient || !mensaje) return;
  const to = normalizarTelefonoE164(telefono);
  if (!to) return;
  try {
    await twilioClient.messages.create({
      from: WHATSAPP_FROM,
      to: to.startsWith('+') ? 'whatsapp:' + to : 'whatsapp:+' + to,
      body: mensaje,
    });
  } catch (e) {
    console.error('Error enviando WhatsApp:', (e as Error).message);
  }
}
