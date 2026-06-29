export type RegistroPayload = {
  ok?: boolean;
  redirect?: string;
  code?: string;
  error?: string;
  title?: string;
};

export type RegistroInterpretResult =
  | { kind: 'success'; redirect: string }
  | { kind: 'error'; code: string; message?: string };

const DEFAULT_SUCCESS_REDIRECT = '/registro-exitoso';

/** Interpreta la respuesta de POST /registrar-usuario (fetch en el navegador). */
export function interpretRegistroResponse(input: {
  status: number;
  redirected: boolean;
  url: string;
  type: string;
  payload: RegistroPayload | null;
}): RegistroInterpretResult {
  const redirectFromPayload = input.payload?.redirect || DEFAULT_SUCCESS_REDIRECT;

  if (input.status >= 300 && input.status < 400) {
    return { kind: 'success', redirect: redirectFromPayload };
  }

  if (input.type === 'opaqueredirect' || input.status === 0) {
    return { kind: 'success', redirect: DEFAULT_SUCCESS_REDIRECT };
  }

  if (input.redirected || /registro-exitoso/i.test(input.url)) {
    return { kind: 'success', redirect: DEFAULT_SUCCESS_REDIRECT };
  }

  if (input.payload?.ok === true) {
    return { kind: 'success', redirect: redirectFromPayload };
  }

  // JSON parcial legacy: { redirect } sin ok explícito
  if (input.status >= 200 && input.status < 300 && input.payload?.redirect) {
    return { kind: 'success', redirect: input.payload.redirect };
  }

  const code = input.payload?.code;
  if (code === 'EMAIL_EXISTS') {
    return { kind: 'error', code, message: input.payload?.error };
  }
  if (code === 'PHONE_TOO_LONG') {
    return { kind: 'error', code, message: input.payload?.error };
  }
  if (code === 'FIELD_TOO_LONG') {
    return { kind: 'error', code, message: input.payload?.error };
  }
  if (code === 'DB_UNAVAILABLE') {
    return { kind: 'error', code, message: input.payload?.error };
  }
  if (code === 'SERVER_ERROR') {
    return { kind: 'error', code, message: input.payload?.error };
  }
  if (input.payload?.error) {
    return { kind: 'error', code: code || 'API_ERROR', message: input.payload.error };
  }

  return { kind: 'error', code: 'UNKNOWN' };
}

export async function parseRegistroPayload(
  res: Response,
): Promise<RegistroPayload | null> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return (await res.json()) as RegistroPayload;
    } catch {
      return null;
    }
  }

  // Algunos proxies/CDN omiten content-type aunque el cuerpo sea JSON.
  try {
    const text = await res.clone().text();
    const trimmed = text.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed) as RegistroPayload;
    }
  } catch {
    // no era JSON
  }

  return null;
}

/** Navegación fiable tras registro (evita fallos silenciosos de router.push). */
export function navigateAfterRegistroSuccess(redirect: string, email?: string): void {
  if (typeof window === 'undefined') return;

  const path =
    redirect.startsWith('http://') || redirect.startsWith('https://')
      ? redirect
      : redirect.startsWith('/')
        ? redirect
        : `/${redirect}`;

  const url = path.startsWith('http')
    ? new URL(path)
    : new URL(path, window.location.origin);

  if (email?.trim()) {
    url.searchParams.set('email', email.trim().toLowerCase());
  }

  window.location.assign(
    path.startsWith('http') ? url.href : `${url.pathname}${url.search}${url.hash}`,
  );
}
