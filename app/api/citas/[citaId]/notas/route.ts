import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requirePsicologo,
} from '@/lib/auth/api';
import {
  decryptMensajeContenido,
  encryptMensajeContenido,
} from '@/lib/crypto/messages';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ citaId: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologo(request);
  if (auth instanceof NextResponse) return auth;

  const { citaId: citaIdParam } = await params;
  const citaId = parseInt(citaIdParam, 10);
  if (Number.isNaN(citaId)) {
    return NextResponse.json({ error: 'citaId inválido' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT c.notas
       FROM citas c
       JOIN psicologos p ON c.psicologo_id = p.id
       WHERE c.id = $1 AND p.usuario_id = $2
       LIMIT 1`,
      [citaId, auth.id],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    const notas = (result.rows[0] as { notas?: string }).notas ?? '';
    return NextResponse.json({ notas: decryptMensajeContenido(notas) });
  } catch (error) {
    console.error('GET /api/citas/[citaId]/notas:', error);
    return NextResponse.json(
      { error: 'Error al obtener notas' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ citaId: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologo(request);
  if (auth instanceof NextResponse) return auth;

  const { citaId: citaIdParam } = await params;
  const citaId = parseInt(citaIdParam, 10);
  if (Number.isNaN(citaId)) {
    return NextResponse.json({ error: 'citaId inválido' }, { status: 400 });
  }

  const body = await parseJsonBody<{ notas?: unknown }>(request);
  const notasStr = (body.notas ?? '').toString();
  const notasParaDb = encryptMensajeContenido(notasStr);

  try {
    const result = await query(
      `UPDATE citas c
       SET notas = $1
       FROM psicologos p
       WHERE c.id = $2 AND c.psicologo_id = p.id AND p.usuario_id = $3
       RETURNING c.id`,
      [notasParaDb, citaId, auth.id],
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/citas/[citaId]/notas:', error);
    return NextResponse.json(
      { error: 'Error al guardar notas' },
      { status: 500 },
    );
  }
}
