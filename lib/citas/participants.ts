import { query } from '@/lib/db';
import {
  formatearCitaEnZona,
  normalizarZonaHoraria,
  type CitaFormateada,
} from '@/lib/citas/timezone';

export interface PersonaCita {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  zona_horaria: string;
}

export type ContextoCitaNotificacion = {
  fecha_hora_utc: string | null;
  fecha: unknown;
  hora: unknown;
  paciente: PersonaCita;
  psicologo: PersonaCita;
  paraPaciente: CitaFormateada;
  paraPsicologo: CitaFormateada;
};

export async function obtenerDatosPacienteYPsicologo(
  pacienteId: number,
  psicologoId: number,
): Promise<{ paciente: PersonaCita | null; psicologo: PersonaCita | null }> {
  const [pacRow, psiRow] = await Promise.all([
    query(
      'SELECT nombre, email, telefono, zona_horaria FROM usuarios WHERE id = $1',
      [pacienteId],
    ).catch(async (e) => {
      const msg = (e as Error).message || '';
      if (msg.includes('zona_horaria')) {
        return query(
          'SELECT nombre, email, telefono FROM usuarios WHERE id = $1',
          [pacienteId],
        );
      }
      throw e;
    }),
    query(
      `SELECT p.nombre, p.zona_horaria, u.email AS usuario_email, u.telefono AS usuario_telefono
       FROM psicologos p JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = $1`,
      [psicologoId],
    ),
  ]);

  const pacRaw = pacRow.rows[0] as
    | { nombre?: string; email?: string; telefono?: string; zona_horaria?: string }
    | undefined;
  const paciente: PersonaCita | null = pacRaw
    ? {
        nombre: pacRaw.nombre ?? null,
        email: pacRaw.email ?? null,
        telefono: pacRaw.telefono ?? null,
        zona_horaria: normalizarZonaHoraria(pacRaw.zona_horaria),
      }
    : null;

  let psicologo: PersonaCita | null = psiRow.rows[0]
    ? {
        nombre: (psiRow.rows[0] as { nombre?: string }).nombre ?? null,
        email:
          (psiRow.rows[0] as { usuario_email?: string }).usuario_email ?? null,
        telefono:
          (psiRow.rows[0] as { usuario_telefono?: string }).usuario_telefono ??
          null,
        zona_horaria: normalizarZonaHoraria(
          (psiRow.rows[0] as { zona_horaria?: string }).zona_horaria,
        ),
      }
    : null;

  if (!psicologo) {
    const r = await query(
      'SELECT nombre, zona_horaria FROM psicologos WHERE id = $1',
      [psicologoId],
    );
    psicologo = r.rows[0]
      ? {
          nombre: (r.rows[0] as { nombre?: string }).nombre ?? null,
          email: null,
          telefono: null,
          zona_horaria: normalizarZonaHoraria(
            (r.rows[0] as { zona_horaria?: string }).zona_horaria,
          ),
        }
      : null;
  }

  if (psicologo && !psicologo.email) {
    try {
      const fallback = await query(
        'SELECT email FROM psicologos WHERE id = $1',
        [psicologoId],
      );
      if ((fallback.rows[0] as { email?: string } | undefined)?.email) {
        psicologo.email = (fallback.rows[0] as { email: string }).email;
      }
    } catch {
      /* ignore */
    }
  }

  return { paciente, psicologo };
}

async function obtenerFechaHoraUtcCita(
  citaId: number | null | undefined,
): Promise<string | null> {
  if (!citaId) return null;
  try {
    const r = await query(
      'SELECT fecha_hora_utc FROM citas WHERE id = $1 LIMIT 1',
      [citaId],
    );
    const raw = (r.rows[0] as { fecha_hora_utc?: string | Date | null } | undefined)
      ?.fecha_hora_utc;
    if (raw == null || String(raw).trim() === '') return null;
    return raw instanceof Date ? raw.toISOString() : String(raw);
  } catch {
    return null;
  }
}

export async function obtenerContextoCitaNotificacion(params: {
  pacienteId: number;
  psicologoId: number;
  fecha: unknown;
  hora: unknown;
  citaId?: number | null;
  fecha_hora_utc?: string | null;
}): Promise<ContextoCitaNotificacion | null> {
  const { paciente, psicologo } = await obtenerDatosPacienteYPsicologo(
    params.pacienteId,
    params.psicologoId,
  );
  if (!paciente || !psicologo) return null;

  const fecha_hora_utc =
    params.fecha_hora_utc ??
    (await obtenerFechaHoraUtcCita(params.citaId)) ??
    null;

  const citaParams = {
    fecha_hora_utc,
    fecha: params.fecha,
    hora: params.hora,
  };

  return {
    fecha_hora_utc,
    fecha: params.fecha,
    hora: params.hora,
    paciente,
    psicologo,
    paraPaciente: formatearCitaEnZona(citaParams, paciente.zona_horaria),
    paraPsicologo: formatearCitaEnZona(citaParams, psicologo.zona_horaria),
  };
}
