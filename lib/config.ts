/** Hostnames de preview de Vercel (deployment protection), no usar en emails. */
function isVercelPreviewHost(host: string): boolean {
  const h = host.toLowerCase();
  if (!h.endsWith('.vercel.app')) return false;
  // producción: proyecto.vercel.app — preview: proyecto-hash-equipo.vercel.app
  const parts = h.replace('.vercel.app', '').split('-');
  return parts.length >= 3;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * URL pública del sitio para enlaces en emails, Stripe, etc.
 * Nunca debe apuntar a un deployment preview de Vercel.
 */
export function getBaseUrl(): string {
  const explicit = [
    process.env.BASE_URL,
    process.env.PUBLIC_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
    .map((v) => (v?.trim() ? normalizeBaseUrl(v!) : ''))
    .find(Boolean);

  if (explicit) {
    const host = hostFromUrl(explicit);
    if (!host || !isVercelPreviewHost(host)) {
      return explicit;
    }
    // BASE_URL apunta por error a un preview; ignorar y usar producción
  }

  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return normalizeBaseUrl(productionHost);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl && !isVercelPreviewHost(vercelUrl)) {
    return normalizeBaseUrl(vercelUrl);
  }

  if (explicit) return explicit;

  return 'http://localhost:3000';
}

/** Para diagnóstico en /api/health */
export function getBaseUrlSource(): string {
  const explicit = [
    process.env.BASE_URL,
    process.env.PUBLIC_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ]
    .map((v) => (v?.trim() ? normalizeBaseUrl(v!) : ''))
    .find(Boolean);

  if (explicit) {
    const host = hostFromUrl(explicit);
    if (host && !isVercelPreviewHost(host)) return 'env:BASE_URL|PUBLIC_URL';
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return 'vercel:VERCEL_PROJECT_PRODUCTION_URL';
  }

  if (process.env.VERCEL_URL?.trim()) return 'vercel:VERCEL_URL';

  return explicit ? 'env:preview-fallback' : 'default:localhost';
}
