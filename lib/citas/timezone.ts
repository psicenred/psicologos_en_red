import { ZONA_HORARIA_DEFECTO } from '@/lib/citas/availability';
import { parseCitaInicio } from '@/lib/citas/cita-timing';

export { ZONA_HORARIA_DEFECTO };

export function normalizarZonaHoraria(zona?: string | null): string {
  const z = (zona || '').trim();
  if (!z || z.toUpperCase() === 'UTC') return ZONA_HORARIA_DEFECTO;
  return z.slice(0, 64);
}

export function esZonaHorariaValida(zona: string): boolean {
  return zona.includes('/') && zona.length <= 64;
}

export function instanteCita(params: {
  fecha_hora_utc?: string | null;
  fecha?: unknown;
  hora?: unknown;
}): Date {
  return parseCitaInicio({
    fecha_hora_utc: params.fecha_hora_utc,
    fecha: params.fecha != null ? String(params.fecha).slice(0, 10) : undefined,
    hora: params.hora != null ? String(params.hora).slice(0, 8) : undefined,
  });
}

export function formatearFechaEnZona(instant: Date, timeZone: string): string {
  const tz = normalizarZonaHoraria(timeZone);
  try {
    return instant.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: tz,
    });
  } catch {
    return instant.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}

export function formatearHoraEnZona(instant: Date, timeZone: string): string {
  const tz = normalizarZonaHoraria(timeZone);
  try {
    return instant.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: tz,
    });
  } catch {
    return instant.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}

export type CitaFormateada = {
  fecha: string;
  hora: string;
  linea: string;
};

export function formatearCitaEnZona(
  params: {
    fecha_hora_utc?: string | null;
    fecha?: unknown;
    hora?: unknown;
  },
  timeZone: string,
): CitaFormateada {
  const instant = instanteCita(params);
  if (Number.isNaN(instant.getTime())) {
    const fecha = params.fecha != null ? String(params.fecha).slice(0, 10) : '—';
    const hora =
      params.hora != null ? String(params.hora).substring(0, 5) : '—';
    return { fecha, hora, linea: `${fecha} · ${hora} hrs` };
  }
  const fecha = formatearFechaEnZona(instant, timeZone);
  const hora = formatearHoraEnZona(instant, timeZone);
  return { fecha, hora, linea: `${fecha} · ${hora} hrs` };
}

export function parseZonaHorariaBody(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const z = value.trim().slice(0, 64);
  if (!esZonaHorariaValida(z)) return null;
  return z;
}
