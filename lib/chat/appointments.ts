import { query } from '@/lib/db';
import { getPsicologoIdFromUsuarioId } from '@/lib/psicologo/id';

export async function hasHadAppointment(
  psychologistUserId: number,
  patientUserId: number,
): Promise<boolean> {
  try {
    const psicologoId = await getPsicologoIdFromUsuarioId(psychologistUserId);
    if (!psicologoId) return false;
    const citaResult = await query(
      `SELECT 1 FROM citas WHERE psicologo_id = $1 AND paciente_id = $2 LIMIT 1`,
      [psicologoId, patientUserId],
    );
    return citaResult.rows.length > 0;
  } catch {
    return false;
  }
}
