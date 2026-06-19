/** Duración estándar de una sesión (1 h). La cita sigue "activa" hasta que termina. */
export const DURACION_SESION_MS = 60 * 60 * 1000;
export const DURACION_SESION_MINUTOS = 60;

/** Expresión SQL: instante timestamptz de una fila citas (alias c). */
export const SQL_CITA_INSTANT_C = `(CASE
  WHEN c.fecha_hora_utc IS NOT NULL AND TRIM(c.fecha_hora_utc) <> ''
    THEN c.fecha_hora_utc::timestamptz
  ELSE ((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), 'America/Mexico_City'))
END)`;

export const ZONA_HORARIA_CITA_SQL = `CASE WHEN NULLIF(TRIM(p.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
  ELSE COALESCE(NULLIF(TRIM(p.zona_horaria), ''), 'America/Mexico_City') END`;

const MS_15 = 15 * 60 * 1000;

export function parseCitaInicio(params: {
  fecha_hora_utc?: string | null;
  fecha?: string;
  hora?: string;
}): Date {
  if (params.fecha_hora_utc) {
    const d = new Date(params.fecha_hora_utc);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const fecha = String(params.fecha || '').slice(0, 10);
  const hora = String(params.hora || '00:00').slice(0, 5);
  return new Date(`${fecha}T${hora}`);
}

export function getCitaFin(inicio: Date): Date {
  return new Date(inicio.getTime() + DURACION_SESION_MS);
}

/** true mientras no haya pasado la hora de fin (ej. 10:00 → activa hasta 11:00 inclusive). */
export function esCitaActiva(
  inicio: Date,
  ahora: Date | number = new Date(),
): boolean {
  if (Number.isNaN(inicio.getTime())) return true;
  const t = typeof ahora === 'number' ? ahora : ahora.getTime();
  return t <= getCitaFin(inicio).getTime();
}

export function puedeUnirseEnVentanaVideo(
  inicio: Date,
  video15Min: boolean,
  ahora: number = Date.now(),
): boolean {
  if (Number.isNaN(inicio.getTime())) return false;
  const start = inicio.getTime();
  const fin = start + DURACION_SESION_MS;
  if (!video15Min) {
    return ahora <= fin;
  }
  return ahora >= start - MS_15 && ahora <= fin;
}
