import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }
  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  if (auth.rol !== 'paciente' && auth.rol !== 'psicologo') {
    return NextResponse.json({ error: 'No aplica' }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      valoracion?: string | number | null;
      comentario?: string | null;
    };

    await query(
      'UPDATE usuarios SET encuesta_satisfaccion_mostrada = true WHERE id = $1',
      [auth.id],
    );

    try {
      await query(
        'INSERT INTO encuestas_satisfaccion (usuario_id, rol, valoracion, comentario) VALUES ($1, $2, $3, $4)',
        [
          auth.id,
          auth.rol,
          body.valoracion != null ? String(body.valoracion) : null,
          body.comentario || null,
        ],
      );
    } catch {
      // Tabla opcional
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/encuesta-satisfaccion:', error);
    return NextResponse.json({ error: 'Error al guardar' }, { status: 500 });
  }
}
