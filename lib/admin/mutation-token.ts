import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

const MAX_AGE_MS = 2 * 60 * 60 * 1000;

const DEV_FALLBACK_SECRET = 'dev-only-insecure-session-secret-min-32-chars!!';

function getSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'SESSION_SECRET debe estar definida para mutaciones del panel admin.',
    );
  }
  return DEV_FALLBACK_SECRET;
}

export function createAdminMutationToken(adminUserId: number): string {
  const ts = Date.now();
  const payload = `${adminUserId}:${ts}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${payload}:${sig}`;
}

export function verifyAdminMutationToken(token: string): number | null {
  try {
    const lastColon = token.lastIndexOf(':');
    if (lastColon <= 0) return null;

    const sig = token.slice(lastColon + 1);
    const payload = token.slice(0, lastColon);
    const sep = payload.indexOf(':');
    if (sep <= 0) return null;

    const adminUserId = parseInt(payload.slice(0, sep), 10);
    const ts = parseInt(payload.slice(sep + 1), 10);
    if (!Number.isFinite(adminUserId) || !Number.isFinite(ts)) return null;
    if (Date.now() - ts > MAX_AGE_MS) return null;

    const expected = createHmac('sha256', getSecret())
      .update(payload)
      .digest('base64url');

    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    return adminUserId;
  } catch {
    return null;
  }
}
