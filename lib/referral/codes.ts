import crypto from 'crypto';
import { query } from '@/lib/db';

/** Sin I, O, 0, 1 para evitar confusiones al compartir el código. */
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

export function normalizeReferralCode(raw: string | null | undefined): string {
  return (raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function generateReferralCodeCandidate(): string {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  }
  return out;
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const candidate = generateReferralCodeCandidate();
    const exists = await query(
      'SELECT 1 FROM usuarios WHERE codigo_referido = $1 LIMIT 1',
      [candidate],
    );
    if (exists.rows.length === 0) return candidate;
  }
  throw new Error('No se pudo generar un código de referido único');
}
