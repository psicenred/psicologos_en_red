import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requirePsicologoId } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId(request);
  if (auth instanceof NextResponse) return auth;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const result = await query(
      `DELETE FROM vacaciones WHERE id = $1 AND psicologo_id = $2`,
      [id, auth.psicologoId],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/vacaciones/[id]:', error);
    return NextResponse.json(
      { error: 'Error al borrar vacaciones' },
      { status: 500 },
    );
  }
}
