import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requirePsicologoId,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';
import { normalizarHoraCompleta } from '@/lib/psicologo/horario';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId();
  if (auth instanceof NextResponse) return auth;

  try {
    const result = await query(
      `SELECT id, psicologo_id, dia_semana, hora_inicio, hora_fin
       FROM horario_laboral
       WHERE psicologo_id = $1
       ORDER BY dia_semana ASC, hora_inicio ASC`,
      [auth.psicologoId],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/horario-laboral:', error);
    return NextResponse.json(
      { error: 'Error al obtener horario' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId();
  if (auth instanceof NextResponse) return auth;

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
      `INSERT INTO horario_laboral (psicologo_id, dia_semana, hora_inicio, hora_fin)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [auth.psicologoId, body.dia_semana, hi, hf],
    );
    return NextResponse.json({
      success: true,
      id: (result.rows[0] as { id: number }).id,
    });
  } catch (error) {
    console.error('POST /api/horario-laboral:', error);
    return NextResponse.json(
      { error: 'Error al guardar horario' },
      { status: 500 },
    );
  }
}
