const REF_CODE_STORAGE_KEY = 'ref_code';

export function buildReferralRegistroPath(codigo: string, locale = 'es'): string {
  const prefix = locale === 'en' ? '/en' : '';
  return `${prefix}/registro?ref=${encodeURIComponent(codigo)}`;
}

export function buildReferralRegistroUrl(
  codigo: string,
  origin: string,
  locale = 'es',
): string {
  const base = origin.replace(/\/$/, '');
  return `${base}${buildReferralRegistroPath(codigo, locale)}`;
}

export function persistReferralCodeFromParam(ref: string | null | undefined): void {
  if (typeof window === 'undefined') return;
  const normalized = (ref || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.length < 4) return;
  localStorage.setItem(REF_CODE_STORAGE_KEY, normalized);
}

export function getStoredReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(REF_CODE_STORAGE_KEY);
  if (!raw) return null;
  const normalized = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized.length >= 4 ? normalized : null;
}

export function clearStoredReferralCode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REF_CODE_STORAGE_KEY);
}

export function whatsAppShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
