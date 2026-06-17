import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  try {
    const result = await query(`
      SELECT e.comentario, e.valoracion, e.rol, u.nombre
      FROM encuestas_satisfaccion e
      JOIN usuarios u ON u.id = e.usuario_id
      WHERE e.comentario IS NOT NULL AND TRIM(e.comentario) != ''
      ORDER BY e.fecha DESC
      LIMIT 100
    `);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/testimonios-encuesta:', error);
    return NextResponse.json([]);
  }
}
