import { query } from '@/lib/db';
import { normalizarZonaHoraria, parseZonaHorariaBody } from '@/lib/citas/timezone';

export async function guardarZonaHorariaPaciente(
  usuarioId: number,
  zona: unknown,
): Promise<void> {
  const parsed = parseZonaHorariaBody(zona);
  if (!parsed) return;

  try {
    await query('UPDATE usuarios SET zona_horaria = $1 WHERE id = $2', [
      normalizarZonaHoraria(parsed),
      usuarioId,
    ]);
  } catch (e) {
    const msg = (e as Error).message || '';
    if (msg.includes('zona_horaria')) return;
    throw e;
  }
}
