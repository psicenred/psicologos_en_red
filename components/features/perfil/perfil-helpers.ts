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
  if (cita.fecha_hora_utc) {
    const d = new Date(cita.fecha_hora_utc);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const fecha = String(cita.fecha || '').slice(0, 10);
  const hora = String(cita.hora || '00:00').slice(0, 5);
  return new Date(`${fecha}T${hora}`);
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
  const d = getCitaDateTime(cita);
  if (Number.isNaN(d.getTime())) return true;
  const fin = new Date(d);
  fin.setHours(fin.getHours() + 1);
  return fin >= ahora;
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
  if (!video15Min) return true;
  const inicio = getCitaDateTime(cita).getTime();
  const ahora = Date.now();
  const MS_15 = 15 * 60 * 1000;
  const MS_60 = 60 * 60 * 1000;
  return ahora >= inicio - MS_15 && ahora <= inicio + MS_60;
}
