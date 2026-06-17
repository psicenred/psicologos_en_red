import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  requireAuthUsuario,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    await query('DELETE FROM disponibilidad_especifica WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/borrar-fecha-especifica/[id]:', error);
    return new NextResponse('Error', { status: 500 });
  }
}
