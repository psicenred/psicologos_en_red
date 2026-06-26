import { normalizeRol } from '@/lib/auth/api';
import { query } from '@/lib/db';

export type CitaParticipantRole = 'paciente' | 'psicologo';

export async function resolveCitaParticipantRole(
  userId: number,
  userRol: string,
  citaId: number,
): Promise<CitaParticipantRole | null> {
  if (Number.isNaN(citaId) || citaId <= 0) return null;

  const result = await query<{
    paciente_id: number;
    psicologo_usuario_id: number;
  }>(
    `SELECT c.paciente_id, p.usuario_id AS psicologo_usuario_id
     FROM citas c
     JOIN psicologos p ON c.psicologo_id = p.id
     WHERE c.id = $1
     LIMIT 1`,
    [citaId],
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0]!;
  if (row.paciente_id === userId) return 'paciente';

  const rol = normalizeRol(userRol);
  if (row.psicologo_usuario_id === userId && rol === 'psicologo') {
    return 'psicologo';
  }

  return null;
}
