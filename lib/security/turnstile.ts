const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return key || null;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function getRequestClientIp(request: Request): string {
  return clientIp(request);
}

/**
 * Verifica el token de Cloudflare Turnstile.
 * Si TURNSTILE_SECRET_KEY no está definida (p. ej. local), no exige CAPTCHA.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteip?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[turnstile] TURNSTILE_SECRET_KEY no configurada; el registro no exige CAPTCHA',
      );
    }
    return { ok: true };
  }

  if (!token?.trim()) {
    return { ok: false, error: 'Completa el CAPTCHA para continuar.' };
  }

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token.trim());
  if (remoteip && remoteip !== 'unknown') {
    body.set('remoteip', remoteip);
  }

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = (await res.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };
    if (!data.success) {
      console.warn('[turnstile] verificación fallida:', data['error-codes']);
      return { ok: false, error: 'CAPTCHA inválido o expirado. Inténtalo de nuevo.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('[turnstile] error de verificación:', err);
    return { ok: false, error: 'No se pudo verificar el CAPTCHA. Inténtalo de nuevo.' };
  }
}
