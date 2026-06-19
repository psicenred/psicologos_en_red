import {
  esCitaActiva,
  parseCitaInicio,
  puedeUnirseEnVentanaVideo,
} from '@/lib/citas/cita-timing';

export type CitaPaciente = {
  id: number;
  psicologo_id: number;
  psicologo_nombre: string;
  fecha: string;
  hora: string;
  estado: string;
  link_sesion?: string | null;
  fecha_hora_utc?: string | null;
  zona_horaria?: string | null;
};

export function getCitaDateTime(cita: CitaPaciente): Date {
  return parseCitaInicio({
    fecha_hora_utc: cita.fecha_hora_utc,
    fecha: cita.fecha,
    hora: cita.hora,
  });
}

export function formatCitaFecha(cita: CitaPaciente): string {
  const d = getCitaDateTime(cita);
  if (Number.isNaN(d.getTime())) {
    return cita.fecha ? String(cita.fecha).slice(0, 10) : '—';
  }
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatCitaHora(cita: CitaPaciente): string {
  const d = getCitaDateTime(cita);
  if (Number.isNaN(d.getTime())) {
    return cita.hora ? String(cita.hora).slice(0, 5) : '—';
  }
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function estadoClass(estado: string): string {
  return (estado || '').toLowerCase().replace(/\s+/g, '-');
}

export function esCitaFutura(cita: CitaPaciente, ahora = new Date()): boolean {
  const estado = (cita.estado || '').toLowerCase();
  if (['cancelada', 'realizada', 'no realizada'].includes(estado)) return false;
  return esCitaActiva(getCitaDateTime(cita), ahora);
}

export function splitCitas(citas: CitaPaciente[]) {
  const ahora = new Date();
  const proximas = citas.filter((c) => esCitaFutura(c, ahora));
  const pasadas = citas
    .filter((c) => !esCitaFutura(c, ahora))
    .sort((a, b) => getCitaDateTime(b).getTime() - getCitaDateTime(a).getTime());
  return { proximas, pasadas };
}

export function getProximaCita(citas: CitaPaciente[]): CitaPaciente | null {
  const { proximas } = splitCitas(citas);
  if (!proximas.length) return null;
  return [...proximas].sort(
    (a, b) => getCitaDateTime(a).getTime() - getCitaDateTime(b).getTime(),
  )[0];
}

export function horasHastaCita(cita: CitaPaciente): number {
  return (getCitaDateTime(cita).getTime() - Date.now()) / 3_600_000;
}

export function puedeCancelar(cita: CitaPaciente): boolean {
  const estado = (cita.estado || '').toLowerCase();
  if (!['pendiente', 'confirmada'].includes(estado)) return false;
  return horasHastaCita(cita) >= 36;
}

export function puedeReagendar(cita: CitaPaciente): boolean {
  const estado = (cita.estado || '').toLowerCase();
  if (!['pendiente', 'confirmada'].includes(estado)) return false;
  return horasHastaCita(cita) >= 24;
}

export function puedeUnirseVideo(cita: CitaPaciente, video15Min: boolean): boolean {
  const estado = (cita.estado || '').toLowerCase();
  if (['cancelada', 'no realizada'].includes(estado)) return false;
  return puedeUnirseEnVentanaVideo(getCitaDateTime(cita), video15Min);
}
