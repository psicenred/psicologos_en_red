import http from 'http';
import https from 'https';

const COUNTRY_DEFAULT_TZ: Record<string, string> = {
  MX: 'America/Mexico_City',
  US: 'America/New_York',
  CA: 'America/Toronto',
  ES: 'Europe/Madrid',
  AR: 'America/Argentina/Buenos_Aires',
  CO: 'America/Bogota',
  PE: 'America/Lima',
  CL: 'America/Santiago',
  EC: 'America/Guayaquil',
};

export const PRECIOS_DEFAULT_MXN = {
  individual: 600,
  pareja: 900,
  crianza: 700,
} as const;

export const PRECIOS_DEFAULT_USD = {
  individual: 55,
  pareja: 75,
  crianza: 65,
} as const;

export interface PrecioRegion {
  amount?: number;
  currency?: 'MXN' | 'USD';
  inMexico?: boolean;
  regionUnknown?: boolean;
}

function parseCountryFromGeoJson(json: Record<string, unknown>): string | null {
  const cc = String(json.country_code || json.countryCode || '').toUpperCase();
  return cc || null;
}

function isIpNoConfiable(ip: string | null | undefined): boolean {
  if (!ip || typeof ip !== 'string') return true;
  const s = ip.replace(/^::ffff:/i, '');
  if (/^127\.|^::1$/i.test(s)) return true;
  if (/^10\./.test(s)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(s)) return true;
  if (/^192\.168\./.test(s)) return true;
  if (/^169\.254\./.test(s)) return true;
  return false;
}

/** IP del cliente desde headers (Vercel / Railway / proxy). */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const envoy = (headers.get('x-envoy-external-address') || '').trim();
  if (envoy) return envoy;
  const realIp = (headers.get('x-real-ip') || '').trim();
  if (realIp) return realIp;
  const forwarded = (headers.get('x-forwarded-for') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (forwarded.length > 0) {
    const client = forwarded[forwarded.length - 1];
    if (client) return client;
  }
  return '127.0.0.1';
}

function fetchJson(url: string, useHttps: boolean): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const lib = useHttps ? https : http;
    lib
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk: string) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data || '{}') as Record<string, unknown>);
          } catch {
            reject(new Error('Invalid JSON'));
          }
        });
      })
      .on('error', reject);
  });
}

/** Precio según geolocalización IP. Si no es seguro, regionUnknown. */
export async function getPrecioRegionAsync(
  request: Request,
): Promise<PrecioRegion> {
  const clientIp = getClientIp(request);
  const isLocalhost = /^127\.|^::1$|^::ffff:127\./i.test(clientIp);
  if (isLocalhost || isIpNoConfiable(clientIp)) {
    return { regionUnknown: true };
  }

  const encodedIp = encodeURIComponent(clientIp);

  function done(cc: string | null): PrecioRegion {
    if (!cc) return { regionUnknown: true };
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

  try {
    const json = await fetchJson(
      `https://reallyfreegeoip.org/json/${encodedIp}`,
      true,
    );
    const cc = parseCountryFromGeoJson(json);
    if (cc) return done(cc);
  } catch {
    /* fallback HTTP */
  }

  try {
    const json = await fetchJson(
      `http://ip-api.com/json/${encodedIp}?fields=countryCode`,
      false,
    );
    return done(parseCountryFromGeoJson(json));
  } catch {
    return { regionUnknown: true };
  }
}

/** Zona horaria IANA por IP (ip-api.com). */
export async function getTimezoneFromIpAsync(
  request: Request,
): Promise<string | null> {
  const clientIp = getClientIp(request);
  if (/^127\.|^::1$|^::ffff:127\./i.test(clientIp) || isIpNoConfiable(clientIp)) {
    return null;
  }
  const encodedIp = encodeURIComponent(clientIp);
  try {
    const json = await fetchJson(
      `http://ip-api.com/json/${encodedIp}?fields=timezone,countryCode`,
      false,
    );
    const tz = json.timezone;
    if (typeof tz === 'string' && tz.includes('/')) return tz.trim();
    const cc = String(json.countryCode || '').toUpperCase();
    return COUNTRY_DEFAULT_TZ[cc] || null;
  } catch {
    return null;
  }
}
