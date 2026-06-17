import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { hasHadAppointment } from '@/lib/chat/appointments';
import { enviarCorreoNotificacionChatSiAplica } from '@/lib/chat/notifications';
import { encryptMensajeContenido } from '@/lib/crypto/messages';
import { isDatabaseConfigured, query } from '@/lib/db';
import { STORAGE_BUCKETS, storageUpload } from '@/lib/storage';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  try {
    const form = await request.formData();
    const file = form.get('archivo');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No se recibió ningún archivo PDF' },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande (máx. 10 MB)' },
        { status: 400 },
      );
    }

    const destinatarioId = parseInt(String(form.get('destinatarioId')), 10);
    if (!destinatarioId) {
      return NextResponse.json(
        { error: 'Falta destinatarioId' },
        { status: 400 },
      );
    }

    let nombreOriginal = (file.name || 'documento.pdf').replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );
    if (!nombreOriginal.toLowerCase().endsWith('.pdf')) {
      nombreOriginal += '.pdf';
    }

    const mimeOk =
      file.type === 'application/pdf' ||
      nombreOriginal.toLowerCase().endsWith('.pdf');
    if (!mimeOk) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF en el chat.' },
        { status: 400 },
      );
    }

    const remitenteId = auth.id;

    if (auth.rol === 'psicologo') {
      const hasAppointment = await hasHadAppointment(
        remitenteId,
        destinatarioId,
      );
      if (!hasAppointment) {
        return NextResponse.json(
          { error: 'No tienes permiso para enviar a este contacto.' },
          { status: 403 },
        );
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const nombreGuardado = Date.now() + '-' + nombreOriginal;
    const objectKey = `${remitenteId}/${nombreGuardado}`;
    const uploaded = await storageUpload(
      STORAGE_BUCKETS.chatAttachments,
      objectKey,
      buffer,
      'application/pdf',
    );

    await query(
      'INSERT INTO mensajes (remitente_id, destinatario_id, contenido, ruta_adjunto, nombre_adjunto) VALUES ($1, $2, $3, $4, $5)',
      [
        remitenteId,
        destinatarioId,
        encryptMensajeContenido('[PDF adjunto]'),
        uploaded.storedPath,
        file.name || nombreOriginal,
      ],
    );

    enviarCorreoNotificacionChatSiAplica(destinatarioId, remitenteId).catch(
      (e) => console.error('Notif chat:', (e as Error).message),
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/chat/adjunto:', error);
    return NextResponse.json(
      { error: 'Error al enviar el archivo' },
      { status: 500 },
    );
  }
}
