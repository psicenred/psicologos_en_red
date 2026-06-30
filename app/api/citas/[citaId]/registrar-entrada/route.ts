import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAuthUsuario,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ citaId: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  const { citaId: citaIdParam } = await params;
  const citaId = parseInt(citaIdParam, 10);
  if (Number.isNaN(citaId)) {
    return NextResponse.json({ error: 'citaId inválido' }, { status: 400 });
  }

  const body = await parseJsonBody<{ rol?: string }>(request);
  const rol =
    body.rol === 'paciente'
      ? 'paciente'
      : body.rol === 'psicologo'
        ? 'psicologo'
        : null;
  if (!rol) {
    return NextResponse.json(
      { error: 'rol debe ser "paciente" o "psicologo"' },
      { status: 400 },
    );
  }

  try {
    if (rol === 'paciente') {
      const r = await query(
        `UPDATE citas SET paciente_entro_at = COALESCE(paciente_entro_at, NOW())
         WHERE id = $1 AND paciente_id = $2
         RETURNING id, paciente_entro_at, psicologo_entro_at`,
        [citaId, auth.id],
      );
      if (r.rows.length === 0) {
        return NextResponse.json(
          { error: 'Cita no encontrada' },
          { status: 404 },
        );
      }
      return NextResponse.json({ success: true });
    }

    const r = await query(
      `UPDATE citas c SET psicologo_entro_at = COALESCE(c.psicologo_entro_at, NOW())
       FROM psicologos p
       WHERE c.id = $1 AND c.psicologo_id = p.id AND p.usuario_id = $2
       RETURNING c.id, c.paciente_entro_at, c.psicologo_entro_at`,
      [citaId, auth.id],
    );
    if (r.rows.length === 0) {
      return NextResponse.json(
        { error: 'Cita no encontrada' },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42703') {
      return NextResponse.json(
        {
          error:
            'Ejecuta la migración add_asistencia_sesion.sql en la base de datos',
        },
        { status: 500 },
      );
    }
    console.error('POST /api/citas/[citaId]/registrar-entrada:', err);
    return NextResponse.json(
      { error: 'Error al registrar entrada' },
      { status: 500 },
    );
  }
}
