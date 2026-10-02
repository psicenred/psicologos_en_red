/**
 * Normaliza email para rate limiting:
 * - minúsculas + trim
 * - si es @gmail.com: quita puntos de la parte local y todo tras "+"
 */
export function normalizeEmailForRateLimit(email: string): string {
  const trimmed = String(email || '').trim().toLowerCase();
  const at = trimmed.lastIndexOf('@');
  if (at <= 0) return trimmed;

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  if (domain === 'gmail.com') {
    const plus = local.indexOf('+');
    if (plus >= 0) local = local.slice(0, plus);
    local = local.replace(/\./g, '');
  }

  return `${local}@${domain}`;
}
