import { query } from '@/lib/db';

export async function getPsicologoIdFromUsuarioId(
  usuarioId: number,
): Promise<number | null> {
  const r = await query(
    'SELECT id FROM psicologos WHERE usuario_id = $1 LIMIT 1',
    [usuarioId],
  );
  return (r.rows[0] as { id?: number } | undefined)?.id ?? null;
}
