import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Base de datos no configurada' }, { status: 503 });
  }
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      psicologo_id?: number;
      comentario?: string;
      estrellas?: number;
    };

    const psicologo_id = body.psicologo_id;
    const comentario = body.comentario ?? '';
    const estrellas = body.estrellas;

    if (!psicologo_id) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    const citaExistente = await query(
      "SELECT id FROM citas WHERE paciente_id = $1 AND psicologo_id = $2 AND estado = 'realizada' LIMIT 1",
      [auth.id, psicologo_id],
    );

    if (citaExistente.rows.length === 0) {
      return NextResponse.json(
        { error: 'No puedes opinar sin haber tenido una cita.' },
        { status: 403 },
      );
    }

    await query(
      'INSERT INTO opiniones (psicologo_id, paciente_id, comentario, estrellas) VALUES ($1, $2, $3, $4)',
      [psicologo_id, auth.id, comentario, estrellas],
    );

    const stats = await query(
      'SELECT AVG(estrellas) as promedio, COUNT(*) as total FROM opiniones WHERE psicologo_id = $1',
      [psicologo_id],
    );

    const statRow = stats.rows[0] as { promedio: string; total: string };
    const nuevoRating = parseFloat(statRow.promedio).toFixed(1);
    const totalResenas = parseInt(statRow.total, 10) || 0;

    await query(
      'UPDATE psicologos SET rating = $1, total_resenas = $2 WHERE id = $3',
      [nuevoRating, totalResenas, psicologo_id],
    );

    return NextResponse.json({
      mensaje: '¡Opinión guardada y rating actualizado!',
      nuevoRating,
    });
  } catch (error) {
    console.error('POST /api/dejar-opinion:', error);
    return NextResponse.json({ error: 'Error al procesar la reseña' }, { status: 500 });
  }
}
