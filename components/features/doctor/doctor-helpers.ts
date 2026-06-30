import {
  esCitaActiva,
  parseCitaInicio,
  puedeUnirseEnVentanaVideo,
} from '@/lib/citas/cita-timing';
import { normalizarZonaHoraria } from '@/lib/citas/timezone';

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
  zona_horaria_psicologo?: string | null;
  motivo?: string | null;
  servicio_interes?: string | null;
};

export function getCitaDateTime(cita: CitaDoctor): Date {
  return parseCitaInicio({
    fecha_hora_utc: cita.fecha_hora_utc,
    fecha: cita.fecha,
    hora: cita.hora,
  });
}

function zonaDoctor(cita: CitaDoctor, override?: string | null): string | undefined {
  const z = override || cita.zona_horaria_psicologo;
  return z ? normalizarZonaHoraria(z) : undefined;
}

export function formatCitaFecha(
  cita: CitaDoctor,
  timeZone?: string | null,
): string {
  const d = getCitaDateTime(cita);
  const tz = zonaDoctor(cita, timeZone);
  if (!Number.isNaN(d.getTime()) && tz) {
    try {
      return d.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: tz,
      });
    } catch {
      /* fallback */
    }
  }
  if (Number.isNaN(d.getTime())) {
    return String(cita.fecha || '').slice(0, 10) || '—';
  }
  return d.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatCitaHora(
  cita: CitaDoctor,
  timeZone?: string | null,
): string {
  const d = getCitaDateTime(cita);
  const tz = zonaDoctor(cita, timeZone);
  if (!Number.isNaN(d.getTime()) && tz) {
    try {
      return d.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
      });
    } catch {
      /* fallback */
    }
  }
  if (Number.isNaN(d.getTime())) {
    return String(cita.hora || '').slice(0, 5) || '—';
  }
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

export function esCitaFutura(cita: CitaDoctor, ahora = new Date()): boolean {
  const estado = (cita.estado || '').toLowerCase();
  if (estado === 'cancelada' || estado === 'no realizada') return false;
  return esCitaActiva(getCitaDateTime(cita), ahora);
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
  return puedeUnirseEnVentanaVideo(getCitaDateTime(cita), video15Min);
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
