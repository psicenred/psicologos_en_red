import { DURACION_SESION_MINUTOS, SQL_CITA_INSTANT_C } from '@/lib/citas/cita-timing';
import { query } from '@/lib/db';

async function marcarCitasRealizadas(): Promise<void> {
  try {
    await query(
      `UPDATE citas c SET estado = 'realizada'
       WHERE c.estado IN ('pendiente', 'confirmada')
         AND c.paciente_entro_at IS NOT NULL
         AND c.psicologo_entro_at IS NOT NULL
         AND (${SQL_CITA_INSTANT_C}) + INTERVAL '1 minute' * $1 < NOW()`,
      [DURACION_SESION_MINUTOS],
    );
  } catch (e) {
    const msg = (e as Error).message || '';
    if (
      msg.includes('zona_horaria') ||
      msg.includes('fecha_hora_utc') ||
      msg.includes('does not exist') ||
      msg.includes('paciente_entro_at')
    ) {
      return;
    }
    throw e;
  }
}

async function marcarCitasNoAsistidas(): Promise<void> {
  try {
    await query(
      `UPDATE citas c SET estado = 'no realizada'
       WHERE c.estado IN ('pendiente', 'confirmada')
         AND (${SQL_CITA_INSTANT_C}) + INTERVAL '1 minute' * $1 < NOW()`,
      [DURACION_SESION_MINUTOS],
    );
  } catch (e) {
    const msg = (e as Error).message || '';
    if (msg.includes('zona_horaria') || msg.includes('fecha_hora_utc') || msg.includes('does not exist')) {
      await query(
        `UPDATE citas SET estado = 'no realizada'
         WHERE estado IN ('pendiente', 'confirmada')
           AND (fecha + hora) + INTERVAL '1 minute' * $1 < NOW()`,
        [DURACION_SESION_MINUTOS],
      );
    }
  }
}

/**
 * Tras terminar la hora de sesión (60 min desde inicio):
 * - realizada si ambos participantes entraron al menos una vez;
 * - no realizada si sigue pendiente/confirmada sin asistencia completa.
 */
export async function marcarCitasNoRealizadas(): Promise<void> {
  await marcarCitasRealizadas();
  await marcarCitasNoAsistidas();
}
