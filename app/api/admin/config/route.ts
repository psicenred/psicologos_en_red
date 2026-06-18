import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAdmin,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const r = await query(
      "SELECT valor FROM config_plataforma WHERE clave = 'video_boton_15min' LIMIT 1",
    );
    const val = (r.rows[0] as { valor?: string } | undefined)?.valor;
    return NextResponse.json({
      video_boton_15min: val !== 'false' && val !== '0',
    });
  } catch {
    return NextResponse.json({ video_boton_15min: true });
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await parseJsonBody<{ video_boton_15min?: unknown }>(request);
  const activar15Min =
    body.video_boton_15min !== false && body.video_boton_15min !== 'false';

  try {
    await query(
      `INSERT INTO config_plataforma (clave, valor) VALUES ('video_boton_15min', $1)
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
      [activar15Min ? 'true' : 'false'],
    );
    return NextResponse.json({
      success: true,
      video_boton_15min: activar15Min,
    });
  } catch (error) {
    console.error('POST /api/admin/config:', error);
    return NextResponse.json(
      { error: 'Error al guardar la configuración' },
      { status: 500 },
    );
  }
}
