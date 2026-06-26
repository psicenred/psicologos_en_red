import crypto from 'crypto';
import { logSecurityWarn } from '@/lib/security/logger';

const MENSAJES_ENCRYPTION_PREFIX = 'ENCv1:';
const ALGORITHM = 'aes-256-gcm';
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function getMensajesEncryptionKey(): Buffer | null {
  const raw = process.env.MENSAJES_ENCRYPTION_KEY?.trim();
  if (raw && raw.length >= 32) {
    return crypto.createHash('sha256').update(raw).digest();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'MENSAJES_ENCRYPTION_KEY debe estar definida y tener al menos 32 caracteres en producción.',
    );
  }

  logSecurityWarn(
    'crypto_misconfig',
    'MENSAJES_ENCRYPTION_KEY no configurada; mensajes sin cifrar en desarrollo',
  );
  return null;
}

export function encryptMensajeContenido(plaintext: string | null | undefined): string {
  const key = getMensajesEncryptionKey();
  if (!key) return plaintext == null ? '' : String(plaintext);
  const str = plaintext == null ? '' : String(plaintext);
  try {
    const iv = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const enc = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([iv, tag, enc]);
    return MENSAJES_ENCRYPTION_PREFIX + combined.toString('base64');
  } catch {
    return str;
  }
}

export function decryptMensajeContenido(value: string | null | undefined): string {
  if (value == null) return '';
  if (typeof value !== 'string') return String(value);
  if (!value.startsWith(MENSAJES_ENCRYPTION_PREFIX)) return value;
  const key = getMensajesEncryptionKey();
  if (!key) return value;
  try {
    const raw = Buffer.from(
      value.slice(MENSAJES_ENCRYPTION_PREFIX.length),
      'base64',
    );
    if (raw.length < IV_LEN + AUTH_TAG_LEN) return value;
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
    const enc = raw.subarray(IV_LEN + AUTH_TAG_LEN);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch {
    return value;
  }
}
