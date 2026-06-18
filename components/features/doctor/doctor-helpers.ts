export type CitaDoctor = {
  cita_id: number;
  fecha: string;
  hora: string;
  estado: string;
  paciente_nombre: string;
  id_para_chat: number;
  notas?: string;
  link_sesion?: string | null;
  fecha_hora_utc?: string | null;
  motivo?: string | null;
};

export function getCitaDateTime(cita: CitaDoctor): Date {
  if (cita.fecha_hora_utc) {
    const d = new Date(cita.fecha_hora_utc);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const fecha = String(cita.fecha || '').slice(0, 10);
  const hora = String(cita.hora || '00:00').slice(0, 5);
  return new Date(`${fecha}T${hora}`);
}

export function formatCitaFecha(cita: CitaDoctor): string {
  const d = getCitaDateTime(cita);
  if (Number.isNaN(d.getTime())) return String(cita.fecha || '').slice(0, 10) || '—';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatCitaHora(cita: CitaDoctor): string {
  const d = getCitaDateTime(cita);
  if (Number.isNaN(d.getTime())) return String(cita.hora || '').slice(0, 5) || '—';
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function esCitaFutura(cita: CitaDoctor, ahora = new Date()): boolean {
  const estado = (cita.estado || '').toLowerCase();
  if (['cancelada', 'realizada', 'no realizada'].includes(estado)) return false;
  const d = getCitaDateTime(cita);
  if (Number.isNaN(d.getTime())) return true;
  const fin = new Date(d);
  fin.setHours(fin.getHours() + 1);
  return fin >= ahora;
}

export function splitCitasDoctor(citas: CitaDoctor[]) {
  const ahora = new Date();
  const proximas = citas.filter((c) => esCitaFutura(c, ahora));
  const pasadas = citas
    .filter((c) => !esCitaFutura(c, ahora))
    .sort((a, b) => getCitaDateTime(b).getTime() - getCitaDateTime(a).getTime());
  return { proximas, pasadas };
}

export function puedeUnirseVideo(cita: CitaDoctor, video15Min: boolean): boolean {
  const estado = (cita.estado || '').toLowerCase();
  if (['cancelada', 'no realizada'].includes(estado)) return false;
  if (!video15Min) return true;
  const inicio = getCitaDateTime(cita).getTime();
  const ahora = Date.now();
  return ahora >= inicio - 15 * 60 * 1000 && ahora <= inicio + 60 * 60 * 1000;
}

export function diasSinCita(
  ultimaCita: string | null | undefined,
  citasFuturas: number | string | null | undefined,
): string {
  const futuras = parseInt(String(citasFuturas ?? 0), 10) || 0;
  if (futuras > 0) return '0';
  if (!ultimaCita) return '—';
  const ultima = new Date(String(ultimaCita).slice(0, 10));
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  ultima.setHours(0, 0, 0, 0);
  const diff = Math.floor((hoy.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
  return String(Math.max(0, diff));
}

const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function nombreDia(dia: number): string {
  return DIAS_NOMBRE[dia] || String(dia);
}
