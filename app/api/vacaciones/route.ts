import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requirePsicologoId,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await query(
      `SELECT id, psicologo_id, fecha_inicio, fecha_fin, motivo
       FROM vacaciones
       WHERE psicologo_id = $1
       ORDER BY fecha_inicio ASC`,
      [auth.psicologoId],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/vacaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener vacaciones' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId(request);
  if (auth instanceof NextResponse) return auth;

  const body = await parseJsonBody<{
    fecha_inicio?: string;
    fecha_fin?: string;
    motivo?: string;
  }>(request);

  if (!body.fecha_inicio) {
    return NextResponse.json(
      { error: 'fecha_inicio es requerida' },
      { status: 400 },
    );
  }

  try {
    const result = await query(
      `INSERT INTO vacaciones (psicologo_id, fecha_inicio, fecha_fin, motivo)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [
        auth.psicologoId,
        body.fecha_inicio,
        body.fecha_fin || body.fecha_inicio,
        body.motivo || null,
      ],
    );
    return NextResponse.json({
      success: true,
      id: (result.rows[0] as { id: number }).id,
    });
  } catch (error) {
    console.error('POST /api/vacaciones:', error);
    return NextResponse.json(
      { error: 'Error al guardar vacaciones' },
      { status: 500 },
    );
  }
}
