import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const { id } = await params;

  try {
    const pResult = await query('SELECT * FROM psicologos WHERE id = $1', [id]);

    if (pResult.rows.length === 0) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    }

    const oResult = await query(
      `SELECT o.*, u.nombre as paciente_nombre
       FROM opiniones o
       JOIN usuarios u ON o.paciente_id = u.id
       WHERE o.psicologo_id = $1
       ORDER BY o.fecha DESC`,
      [id],
    );

    return NextResponse.json({
      datos: pResult.rows[0],
      opiniones: oResult.rows,
    });
  } catch (error) {
    console.error('GET /api/psicologo/[id]:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error interno' },
      { status: 500 },
    );
  }
}
