import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ mostrar: false });
  }
  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  if (auth.rol !== 'paciente') {
    return NextResponse.json({ mostrar: false });
  }

  try {
    const r = await query(
      `SELECT c.psicologo_id, p.nombre AS psicologo_nombre
       FROM citas c
       JOIN psicologos p ON p.id = c.psicologo_id
       WHERE c.paciente_id = $1 AND c.estado = 'realizada'
         AND NOT EXISTS (SELECT 1 FROM opiniones o WHERE o.paciente_id = $1 AND o.psicologo_id = c.psicologo_id)
       GROUP BY c.psicologo_id, p.nombre
       HAVING COUNT(*) >= 3
       ORDER BY MAX(c.fecha + c.hora) DESC
       LIMIT 1`,
      [auth.id],
    );

    if (r.rows.length === 0) {
      return NextResponse.json({ mostrar: false });
    }

    const row = r.rows[0] as { psicologo_id: number; psicologo_nombre: string };
    return NextResponse.json({
      mostrar: true,
      psicologo_id: row.psicologo_id,
      psicologo_nombre: row.psicologo_nombre || 'Tu psicólogo',
    });
  } catch (error) {
    console.error('GET /api/debo-opinar-psicologo:', error);
    return NextResponse.json({ mostrar: false });
  }
}
