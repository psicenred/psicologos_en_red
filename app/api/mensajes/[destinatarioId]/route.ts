import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { canExchangeMessages } from '@/lib/chat/appointments';
import { decryptMensajeContenido } from '@/lib/crypto/messages';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ destinatarioId: string }> },
) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  const { destinatarioId: destinatarioIdParam } = await params;
  const suId = destinatarioIdParam;
  const miId = auth.id;

  if (!suId || suId === 'undefined' || Number.isNaN(parseInt(suId, 10))) {
    return NextResponse.json({ mensajes: [], miId });
  }

  try {
    const destinatarioNum = parseInt(suId, 10);
    const allowed = await canExchangeMessages(miId, auth.rol, destinatarioNum);
    if (!allowed) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver este historial de mensajes.' },
        { status: 403 },
      );
    }

    const result = await query(
      `SELECT * FROM mensajes
       WHERE (remitente_id = $1 AND destinatario_id = $2)
          OR (remitente_id = $2 AND destinatario_id = $1)
       ORDER BY fecha_envio ASC`,
      [miId, parseInt(suId, 10)],
    );

    const mensajes = result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        ...r,
        contenido: decryptMensajeContenido(String(r.contenido ?? '')),
      };
    });

    await query(
      `UPDATE mensajes SET leido = true
       WHERE destinatario_id = $1 AND remitente_id = $2 AND (leido IS NULL OR leido = false)`,
      [miId, parseInt(suId, 10)],
    );

    return NextResponse.json({ mensajes, miId });
  } catch (error) {
    console.error('GET /api/mensajes/[destinatarioId]:', error);
    return NextResponse.json(
      { error: 'Error al cargar mensajes' },
      { status: 500 },
    );
  }
}
