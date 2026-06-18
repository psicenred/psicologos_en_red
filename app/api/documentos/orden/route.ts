import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requirePsicologoId,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function PUT(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId(request);
  if (auth instanceof NextResponse) return auth;

  const body = await parseJsonBody<{ ids?: unknown }>(request);
  const ids = body.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: 'Se requiere un array ids' },
      { status: 400 },
    );
  }

  try {
    for (let i = 0; i < ids.length; i++) {
      await query(
        'UPDATE documentos_psicologo SET orden = $1 WHERE id = $2 AND psicologo_id = $3',
        [i, ids[i], auth.psicologoId],
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/documentos/orden:', error);
    return NextResponse.json(
      { error: 'Error al actualizar orden' },
      { status: 500 },
    );
  }
}
