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

export function generarIcsCita(opciones: {
  citaId?: number | null;
  paciente_id?: number;
  psicologo_id?: number;
  fecha: unknown;
  hora: unknown;
  titulo?: string;
  descripcion?: string;
  accion?: 'crear' | 'cancelar';
}): string {
  const { citaId, fecha, hora, titulo, descripcion, accion } = opciones;
  const uid = citaId
    ? `cita-${citaId}@psicologosenred.com`
    : `cita-${opciones.paciente_id}-${opciones.psicologo_id}-${normalizarFechaParaEmail(fecha)}-${String(hora || '').replace(/:/g, '')}@psicologosenred.com`;
  const normFecha = normalizarFechaParaEmail(fecha);
  const horaPart = (hora != null ? String(hora).trim() : '09:00').substring(0, 5);
  const [hh, mm] = horaPart.split(':').map((n) => parseInt(n, 10) || 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  const startDate = new Date(normFecha + 'T' + horaPart + ':00');
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  const dtStart = `${normFecha.replace(/-/g, '')}T${pad(hh)}${pad(mm)}00`;
  const dtEnd = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const safe = (s: string) =>
    (s || '').replace(/\r?\n/g, ' ').replace(/[,;\\]/g, '\\$&');

  if (accion === 'cancelar') {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Psicólogos en Red//ES',
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
