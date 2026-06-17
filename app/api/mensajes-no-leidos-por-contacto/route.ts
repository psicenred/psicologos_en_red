import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  try {
    const r = await query(
      `SELECT remitente_id, COUNT(*)::int AS total FROM mensajes
       WHERE destinatario_id = $1 AND (leido IS NULL OR leido = false)
       GROUP BY remitente_id`,
      [auth.id],
    );
    const porContacto: Record<string, number> = {};
    (r.rows as { remitente_id: number; total: number }[]).forEach((row) => {
      if (row.remitente_id != null) {
        porContacto[String(row.remitente_id)] = row.total || 0;
      }
    });
    return NextResponse.json(porContacto);
  } catch (error) {
    console.error('GET /api/mensajes-no-leidos-por-contacto:', error);
    return NextResponse.json({});
  }
}
