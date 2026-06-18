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
      `SELECT id, titulo, tipo, ruta_archivo, created_at, updated_at, orden
       FROM documentos_psicologo
       WHERE psicologo_id = $1
       ORDER BY orden ASC NULLS LAST, updated_at DESC`,
      [auth.psicologoId],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/documentos:', error);
    return NextResponse.json(
      { error: 'Error al obtener documentos' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologoId(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await parseJsonBody<{
      titulo?: string;
      contenido?: string;
    }>(request);
    const result = await query(
      `INSERT INTO documentos_psicologo (psicologo_id, titulo, contenido)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        auth.psicologoId,
        body.titulo || 'Nuevo documento',
        body.contenido || '',
      ],
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/documentos:', error);
    return NextResponse.json(
      { error: 'Error al crear documento' },
      { status: 500 },
    );
  }
}
