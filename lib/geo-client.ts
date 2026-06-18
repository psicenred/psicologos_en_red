import {
  PRECIOS_DEFAULT_MXN,
  PRECIOS_DEFAULT_USD,
  type PrecioRegion,
} from '@/lib/geo';

function parseCountryRegion(data: Record<string, unknown>): PrecioRegion | null {
  const cc = String(data.country_code || data.countryCode || '').toUpperCase();
  if (!cc) return null;
  const inMexico = cc === 'MX';
  return inMexico
    ? {
        amount: PRECIOS_DEFAULT_MXN.individual,
        currency: 'MXN',
        inMexico: true,
      }
    : {
        amount: PRECIOS_DEFAULT_USD.individual,
        currency: 'USD',
        inMexico: false,
      };
}

function parseApiRegion(data: Record<string, unknown>): PrecioRegion | null {
  if (data.regionUnknown) return { regionUnknown: true };
  const currency = data.currency;
  if (currency !== 'MXN' && currency !== 'USD') return null;
  return {
    amount: typeof data.amount === 'number' ? data.amount : undefined,
    currency,
    inMexico: data.inMexico === true,
  };
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

/**
 * Detecta región/precios como en catalogo.html legacy:
 * ipapi.co → api.ip.sb → /api/precio-region (IP del servidor).
 */
export async function fetchPrecioRegionClient(): Promise<PrecioRegion> {
  const geoUrls = ['https://ipapi.co/json/', 'https://api.ip.sb/geoip'];

  for (const url of geoUrls) {
    try {
      const data = await fetchJson(url);
      const region = parseCountryRegion(data);
      if (region) return region;
    } catch {
      /* siguiente proveedor */
    }
  }

  try {
    const data = await fetchJson('/api/precio-region');
    const region = parseApiRegion(data);
    if (region) return region;
  } catch {
    /* sin región */
  }

  return { regionUnknown: true };
}
