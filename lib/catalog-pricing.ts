import { PRECIOS_DEFAULT_MXN, PRECIOS_DEFAULT_USD } from '@/lib/geo';

export type PsicologoPricing = {
  precio_terapia_individual: number | null;
  precio_terapia_individual_usd: number | null;
  precio_terapia_pareja?: number | null;
  precio_terapia_pareja_usd?: number | null;
  precio_asesoria_crianza?: number | null;
  precio_asesoria_crianza_usd?: number | null;
};

export function minSessionPrice(p: PsicologoPricing, currency: string): number {
  const isMxn = currency === 'MXN';
  const defs = isMxn ? PRECIOS_DEFAULT_MXN : PRECIOS_DEFAULT_USD;
  const pi = isMxn
    ? p.precio_terapia_individual != null
      ? Number(p.precio_terapia_individual)
      : defs.individual
    : p.precio_terapia_individual_usd != null
      ? Number(p.precio_terapia_individual_usd)
      : defs.individual;
  const pp = isMxn
    ? p.precio_terapia_pareja != null
      ? Number(p.precio_terapia_pareja)
      : defs.pareja
    : p.precio_terapia_pareja_usd != null
      ? Number(p.precio_terapia_pareja_usd)
      : defs.pareja;
  const pc = isMxn
    ? p.precio_asesoria_crianza != null
      ? Number(p.precio_asesoria_crianza)
      : defs.crianza
    : p.precio_asesoria_crianza_usd != null
      ? Number(p.precio_asesoria_crianza_usd)
      : defs.crianza;
  return Math.min(pi, pp, pc);
}

/** Precio de una sesión según el servicio elegido (paridad legacy catálogo). */
export function sessionPriceForService(
  p: PsicologoPricing,
  servicioInteres: string,
  currency: string,
): number | null {
  const svc = (servicioInteres || '').trim();
  if (!svc) return null;

  const isMxn = currency === 'MXN';
  const defs = isMxn ? PRECIOS_DEFAULT_MXN : PRECIOS_DEFAULT_USD;
  const pi = isMxn
    ? p.precio_terapia_individual != null
      ? Number(p.precio_terapia_individual)
      : defs.individual
    : p.precio_terapia_individual_usd != null
      ? Number(p.precio_terapia_individual_usd)
      : defs.individual;
  const pp = isMxn
    ? p.precio_terapia_pareja != null
      ? Number(p.precio_terapia_pareja)
      : defs.pareja
    : p.precio_terapia_pareja_usd != null
      ? Number(p.precio_terapia_pareja_usd)
      : defs.pareja;
  const pc = isMxn
    ? p.precio_asesoria_crianza != null
      ? Number(p.precio_asesoria_crianza)
      : defs.crianza
    : p.precio_asesoria_crianza_usd != null
      ? Number(p.precio_asesoria_crianza_usd)
      : defs.crianza;

  const lower = svc.toLowerCase();
  if (lower.includes('pareja')) return pp;
  if (lower.includes('crianza')) return pc;
  return pi;
}
