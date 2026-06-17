import { query } from '@/lib/db';

export interface PersonaCita {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
}

export async function obtenerDatosPacienteYPsicologo(
  pacienteId: number,
  psicologoId: number,
): Promise<{ paciente: PersonaCita | null; psicologo: PersonaCita | null }> {
  const [pacRow, psiRow] = await Promise.all([
    query('SELECT nombre, email, telefono FROM usuarios WHERE id = $1', [
      pacienteId,
    ]),
    query(
      `SELECT p.nombre, u.email AS usuario_email, u.telefono AS usuario_telefono
       FROM psicologos p JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = $1`,
      [psicologoId],
    ),
  ]);

  const paciente = (pacRow.rows[0] as PersonaCita | undefined) ?? null;
  let psicologo: PersonaCita | null = psiRow.rows[0]
    ? {
        nombre: (psiRow.rows[0] as { nombre?: string }).nombre ?? null,
        email:
          (psiRow.rows[0] as { usuario_email?: string }).usuario_email ?? null,
        telefono:
          (psiRow.rows[0] as { usuario_telefono?: string }).usuario_telefono ??
          null,
      }
    : null;

  if (!psicologo) {
    const r = await query('SELECT nombre FROM psicologos WHERE id = $1', [
      psicologoId,
    ]);
    psicologo = r.rows[0]
      ? {
          nombre: (r.rows[0] as { nombre?: string }).nombre ?? null,
          email: null,
          telefono: null,
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
