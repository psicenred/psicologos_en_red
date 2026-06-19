'use client';

/** Zona IANA del navegador (ej. Asia/Tokyo). Solo usar en cliente. */
export function getZonaNavegador(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && tz.includes('/')) return tz;
  } catch {
    /* ignore */
  }
  return 'America/Mexico_City';
}

export function formatHoraLocalDesdeIso(
  horaPsicologo: string,
  isoUtc?: string | null,
): string {
  if (isoUtc) {
    try {
      const d = new Date(isoUtc);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    } catch {
      /* fallback */
    }
  }
  const h = parseInt(horaPsicologo.split(':')[0], 10);
  const periodo = h < 12 ? 'AM' : 'PM';
  const hora12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${String(hora12).padStart(2, '0')}:00 ${periodo}`;
}
