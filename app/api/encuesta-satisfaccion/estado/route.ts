import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ mostrarEncuesta: false });
  }
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.rol !== 'paciente' && auth.rol !== 'psicologo') {
    return NextResponse.json({ mostrarEncuesta: false });
  }

  try {
    const r = await query(
      'SELECT veces_inicio_sesion, encuesta_satisfaccion_mostrada FROM usuarios WHERE id = $1',
      [auth.id],
    );
    if (r.rows.length === 0) return NextResponse.json({ mostrarEncuesta: false });
    const row = r.rows[0] as {
      veces_inicio_sesion: number | null;
      encuesta_satisfaccion_mostrada: boolean | null;
    };
    const veces = parseInt(String(row.veces_inicio_sesion), 10) || 0;
    const yaMostrada = !!row.encuesta_satisfaccion_mostrada;
    return NextResponse.json({ mostrarEncuesta: veces >= 6 && !yaMostrada });
  } catch (error) {
    console.error('GET /api/encuesta-satisfaccion/estado:', error);
    return NextResponse.json({ mostrarEncuesta: false });
  }
}
