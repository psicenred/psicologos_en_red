import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';
import { anonymizeDisplayName } from '@/lib/security/anonymize';

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

    const rows = result.rows.map((row) => {
      const r = row as { comentario: string; valoracion: number; rol: string; nombre: string };
      return {
        comentario: r.comentario,
        valoracion: r.valoracion,
        rol: r.rol,
        nombre: anonymizeDisplayName(r.nombre),
      };
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error('GET /api/testimonios-encuesta:', error);
    return NextResponse.json([]);
  }
}
