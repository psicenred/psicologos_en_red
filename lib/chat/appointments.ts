import { normalizeRol } from '@/lib/auth/api';
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

/** Valida que dos usuarios puedan intercambiar mensajes (relación terapéutica previa). */
export async function canExchangeMessages(
  senderId: number,
  senderRol: string,
  destinatarioId: number,
): Promise<boolean> {
  const rol = normalizeRol(senderRol);

  if (rol === 'admin') return true;

  if (rol === 'psicologo') {
    return hasHadAppointment(senderId, destinatarioId);
  }

  const destinatarioEsPsicologo = await getPsicologoIdFromUsuarioId(destinatarioId);
  if (!destinatarioEsPsicologo) return false;

  return hasHadAppointment(destinatarioId, senderId);
}
