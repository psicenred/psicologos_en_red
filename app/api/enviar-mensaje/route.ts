import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAuthUsuario,
} from '@/lib/auth/api';
import { hasHadAppointment } from '@/lib/chat/appointments';
import { enviarCorreoNotificacionChatSiAplica } from '@/lib/chat/notifications';
import { encryptMensajeContenido } from '@/lib/crypto/messages';
import { isDatabaseConfigured, query } from '@/lib/db';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  const body = await parseJsonBody<{
    destinatarioId?: number | string;
    contenido?: string;
  }>(request);
  const destinatarioId = parseInt(String(body.destinatarioId), 10);
  const remitenteId = auth.id;

  if (!destinatarioId || Number.isNaN(destinatarioId)) {
    return NextResponse.json(
      { error: 'destinatarioId inválido' },
      { status: 400 },
    );
  }

  try {
    if (auth.rol === 'psicologo') {
      const hasAppointment = await hasHadAppointment(remitenteId, destinatarioId);
      if (!hasAppointment) {
        return NextResponse.json(
          {
            error:
              'No puedes enviar mensajes a este paciente sin una cita previa.',
          },
          { status: 403 },
        );
      }
    }

    await query(
      'INSERT INTO mensajes (remitente_id, destinatario_id, contenido) VALUES ($1, $2, $3)',
      [remitenteId, destinatarioId, encryptMensajeContenido(body.contenido)],
    );

    enviarCorreoNotificacionChatSiAplica(destinatarioId, remitenteId).catch(
      (e) => console.error('Notif chat:', (e as Error).message),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/enviar-mensaje:', error);
    return NextResponse.json(
      { error: 'No se pudo enviar el mensaje' },
      { status: 500 },
    );
  }
}
