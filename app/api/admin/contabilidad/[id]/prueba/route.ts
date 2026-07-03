import { NextResponse } from 'next/server';
import { setContabilidadEsPrueba } from '@/lib/admin/contabilidad';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAdmin,
} from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';

export async function PATCH(
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

  const body = await parseJsonBody<{ es_prueba?: unknown }>(request);
  const esPrueba = body.es_prueba === true || body.es_prueba === 'true';

  try {
    const row = await setContabilidadEsPrueba(id, esPrueba);
    if (!row) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    return NextResponse.json(row);
  } catch (error) {
    const msg = (error as Error).message || '';
    if (msg === 'missing_contabilidad_columns') {
      return NextResponse.json(
        {
          error:
            'Ejecuta la migración add_contabilidad_citas.sql para habilitar marcas de prueba.',
        },
        { status: 503 },
      );
    }
    console.error('PATCH /api/admin/contabilidad/[id]/prueba:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la cita' },
      { status: 500 },
    );
  }
}
