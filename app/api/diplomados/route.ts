import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  try {
    const result = await query(
      `SELECT id, area, titulo, fecha_inicio, descripcion_corta, descripcion_larga, url_imagen, mensaje_whatsapp, orden
       FROM diplomados
       WHERE activo = true
       ORDER BY orden ASC, id ASC`,
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/diplomados:', error);
    return NextResponse.json(
      { error: 'Error al cargar diplomados' },
      { status: 500 },
    );
  }
}
