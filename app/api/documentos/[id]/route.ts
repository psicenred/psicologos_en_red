import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requirePsicologoId,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(
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
      `SELECT * FROM documentos_psicologo WHERE id = $1 AND psicologo_id = $2`,
      [id, auth.psicologoId],
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('GET /api/documentos/[id]:', error);
    return NextResponse.json(
      { error: 'Error al obtener documento' },
      { status: 500 },
    );
  }
}

export async function PUT(
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
    const body = await parseJsonBody<{
      titulo?: string;
      contenido?: string;
    }>(request);
    const result = await query(
      `UPDATE documentos_psicologo
       SET titulo = COALESCE($1, titulo),
           contenido = COALESCE($2, contenido),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND psicologo_id = $4
       RETURNING *`,
      [body.titulo, body.contenido, id, auth.psicologoId],
    );
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('PUT /api/documentos/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar documento' },
      { status: 500 },
    );
  }
}

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
      `DELETE FROM documentos_psicologo WHERE id = $1 AND psicologo_id = $2`,
      [id, auth.psicologoId],
    );
    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/documentos/[id]:', error);
    return NextResponse.json(
      { error: 'Error al eliminar documento' },
      { status: 500 },
    );
  }
}
