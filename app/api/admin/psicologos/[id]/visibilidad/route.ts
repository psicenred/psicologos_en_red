import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAdmin,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const body = await parseJsonBody<{
    visible_mexico?: unknown;
    visible_internacional?: unknown;
  }>(request);
  const vm = body.visible_mexico === true || body.visible_mexico === 'true';
  const vi =
    body.visible_internacional === true ||
    body.visible_internacional === 'true';

  try {
    const result = await query(
      `UPDATE psicologos
       SET visible_mexico = $1, visible_internacional = $2
       WHERE id = $3
       RETURNING id, visible_mexico, visible_internacional`,
      [vm, vi, id],
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Psicólogo no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('PUT /api/admin/psicologos/[id]/visibilidad:', error);
    return NextResponse.json(
      { error: 'Error al actualizar visibilidad' },
      { status: 500 },
    );
  }
}
