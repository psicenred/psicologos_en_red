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

function toYmd(value: string | Date | null | undefined): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  return null;
}

export function diasSinCita(
  ultimaCita: string | Date | null | undefined,
  citasFuturas: number | string | null | undefined,
): string {
  const futuras = parseInt(String(citasFuturas ?? 0), 10) || 0;
  if (futuras > 0) return '0';
  const ymd = toYmd(ultimaCita);
  if (!ymd) return '—';

  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return '—';

  const ultimaUtc = Date.UTC(y, m - 1, d);
  const now = new Date();
  const hoyUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((hoyUtc - ultimaUtc) / (1000 * 60 * 60 * 24));
  return String(Math.max(0, diff));
}

const DIAS_NOMBRE = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function nombreDia(dia: number): string {
  return DIAS_NOMBRE[dia] || String(dia);
}
