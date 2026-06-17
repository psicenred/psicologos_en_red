import { NextResponse } from 'next/server';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ activar15MinAntes: true });
  }
  try {
    const r = await query(
      "SELECT valor FROM config_plataforma WHERE clave = 'video_boton_15min' LIMIT 1",
    );
    const val = (r.rows[0] as { valor?: string } | undefined)?.valor;
    const activar15MinAntes = val !== 'false' && val !== '0';
    return NextResponse.json({ activar15MinAntes: !!activar15MinAntes });
  } catch {
    return NextResponse.json({ activar15MinAntes: true });
  }
}
