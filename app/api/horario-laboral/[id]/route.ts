import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requirePsicologoId,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';
import { normalizarHoraCompleta } from '@/lib/psicologo/horario';

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

  const body = await parseJsonBody<{
    dia_semana?: unknown;
    hora_inicio?: unknown;
    hora_fin?: unknown;
  }>(request);

  if (
    body.dia_semana === undefined ||
    body.hora_inicio === undefined ||
    body.hora_fin === undefined
  ) {
    return NextResponse.json(
      { error: 'Faltan datos (dia_semana, hora_inicio, hora_fin)' },
      { status: 400 },
    );
  }

  const hi = normalizarHoraCompleta(String(body.hora_inicio), 'inicio');
  const hf = normalizarHoraCompleta(String(body.hora_fin), 'fin');
  if (!hi || !hf) {
    return NextResponse.json(
      { error: 'Horas inválidas; usa formato HH:00 (horas en punto)' },
      { status: 400 },
    );
  }
  if (hf <= hi) {
    return NextResponse.json(
      { error: 'La hora de fin debe ser mayor que la de inicio' },
      { status: 400 },
    );
  }

  try {
    const result = await query(
      `UPDATE horario_laboral
       SET dia_semana = $1, hora_inicio = $2, hora_fin = $3
       WHERE id = $4 AND psicologo_id = $5`,
      [body.dia_semana, hi, hf, id, auth.psicologoId],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /api/horario-laboral/[id]:', error);
    return NextResponse.json(
      { error: 'Error al actualizar horario' },
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
      `DELETE FROM horario_laboral WHERE id = $1 AND psicologo_id = $2`,
      [id, auth.psicologoId],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/horario-laboral/[id]:', error);
    return NextResponse.json(
      { error: 'Error al borrar horario' },
      { status: 500 },
    );
  }
}
