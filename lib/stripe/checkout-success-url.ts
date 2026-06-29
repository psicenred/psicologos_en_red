const SESSION_ID_TOKEN = '{CHECKOUT_SESSION_ID}';

/** Añade session_id de Stripe al volver del checkout (respaldo si falla el webhook). */
export function withCheckoutSessionId(successUrl: string): string {
  if (successUrl.includes('session_id=')) return successUrl;
  const sep = successUrl.includes('?') ? '&' : '?';
  return `${successUrl}${sep}session_id=${SESSION_ID_TOKEN}`;
}
