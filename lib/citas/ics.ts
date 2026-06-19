import { instanteCita } from '@/lib/citas/timezone';
import { DURACION_SESION_MS } from '@/lib/citas/cita-timing';

export function normalizarFechaParaEmail(fecha: unknown): string {
  if (fecha == null) return '';
  if (fecha instanceof Date) {
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toISOString().slice(0, 10);
  }
  const s = String(fecha).trim();
  const match = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : s.slice(0, 10);
}

/** @deprecated Usar formatearCitaEnZona con fecha_hora_utc */
export function formatearFechaParaEmail(fecha: unknown): string {
  const norm = normalizarFechaParaEmail(fecha);
  if (!norm) return '—';
  const d = new Date(norm + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function padIcs(n: number): string {
  return String(n).padStart(2, '0');
}

function toIcsUtc(d: Date): string {
  return (
    `${d.getUTCFullYear()}${padIcs(d.getUTCMonth() + 1)}${padIcs(d.getUTCDate())}` +
    `T${padIcs(d.getUTCHours())}${padIcs(d.getUTCMinutes())}${padIcs(d.getUTCSeconds())}Z`
  );
}

export function generarIcsCita(opciones: {
  citaId?: number | null;
  paciente_id?: number;
  psicologo_id?: number;
  fecha: unknown;
  hora: unknown;
  fecha_hora_utc?: string | null;
  titulo?: string;
  descripcion?: string;
  accion?: 'crear' | 'cancelar';
}): string {
  const { citaId, fecha, hora, titulo, descripcion, accion } = opciones;
  const uid = citaId
    ? `cita-${citaId}@psicologosenred.com`
    : `cita-${opciones.paciente_id}-${opciones.psicologo_id}-${normalizarFechaParaEmail(fecha)}-${String(hora || '').replace(/:/g, '')}@psicologosenred.com`;

  const startDate = instanteCita({
    fecha_hora_utc: opciones.fecha_hora_utc,
    fecha,
    hora,
  });
  const endDate = new Date(
    Number.isNaN(startDate.getTime())
      ? Date.now() + DURACION_SESION_MS
      : startDate.getTime() + DURACION_SESION_MS,
  );

  const dtStart = Number.isNaN(startDate.getTime())
    ? toIcsUtc(new Date())
    : toIcsUtc(startDate);
  const dtEnd = toIcsUtc(endDate);
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const safe = (s: string) =>
    (s || '').replace(/\r?\n/g, ' ').replace(/[,;\\]/g, '\\$&');

  if (accion === 'cancelar') {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Psicólogos en Red//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:CANCEL',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + now + 'Z',
      'DTSTART:' + dtStart,
      'DTEND:' + dtEnd,
      'SUMMARY:' + safe(titulo || 'Sesión cancelada'),
      'STATUS:CANCELLED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Psicólogos en Red//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    'UID:' + uid,
    'DTSTAMP:' + now + 'Z',
    'DTSTART:' + dtStart,
    'DTEND:' + dtEnd,
    'SUMMARY:' + safe(titulo || 'Sesión - Psicólogos en Red'),
    'DESCRIPTION:' + safe(descripcion || 'Cita agendada en Psicólogos en Red.'),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
