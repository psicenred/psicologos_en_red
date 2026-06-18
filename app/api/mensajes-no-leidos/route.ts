import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ count: 0 });
  }
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const r = await query(
      `SELECT COUNT(*)::int AS total FROM mensajes
       WHERE destinatario_id = $1 AND (leido IS NULL OR leido = false)`,
      [auth.id],
    );
    const total = (r.rows[0] as { total?: number } | undefined)?.total ?? 0;
    return NextResponse.json({ count: total });
  } catch (error) {
    console.error('GET /api/mensajes-no-leidos:', error);
    return NextResponse.json({ count: 0 });
  }
}
