/** Valor por defecto cuando no hay servicio guardado (citas legacy). */
export const SERVICIO_INDIVIDUAL_DEFAULT = 'Terapia Individual';

export function normalizeServicioInteres(
  raw: string | null | undefined,
): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 100);
}

/** Etiqueta corta para tarjetas de cita (paciente y psicólogo). */
export function formatEtiquetaSesion(
  servicio: string | null | undefined,
): string {
  const s = (servicio || '').trim();
  if (!s) return 'Sesión de psicoterapia';

  const lower = s.toLowerCase();
  if (lower.includes('pareja')) return 'Sesión de pareja';
  if (lower.includes('crianza')) return 'Sesión de asesoría de crianza';
  if (lower.includes('individual')) return 'Sesión individual';

  return s;
}

/** Servicio efectivo para cobro / agendar otra cuando falta en DB legacy. */
export function servicioInteresOrDefault(
  raw: string | null | undefined,
): string {
  return normalizeServicioInteres(raw) || SERVICIO_INDIVIDUAL_DEFAULT;
}
