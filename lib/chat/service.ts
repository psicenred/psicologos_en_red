import 'server-only';

import { normalizeRol } from '@/lib/auth/api';
import { hasHadAppointment } from '@/lib/chat/appointments';
import { enviarCorreoNotificacionChatSiAplica } from '@/lib/chat/notifications';
import { encryptMensajeContenido, decryptMensajeContenido } from '@/lib/crypto/messages';
import { isDatabaseConfigured, query } from '@/lib/db';
import { STORAGE_BUCKETS, storageUpload } from '@/lib/storage';
import type { SessionUsuario } from '@/lib/session';

export type ChatMensaje = {
  id: number;
  contenido: string;
  remitente_id: number;
  ruta_adjunto?: string | null;
  nombre_adjunto?: string | null;
  fecha_envio?: string;
};

async function assertCanMessage(
  auth: SessionUsuario,
  destinatarioId: number,
): Promise<{ ok: true } | { ok: false; error: string; status: 403 }> {
  if (normalizeRol(auth.rol) === 'psicologo') {
    const hasAppointment = await hasHadAppointment(auth.id, destinatarioId);
    if (!hasAppointment) {
      return {
        ok: false,
        error: 'No tienes permiso para contactar a este usuario sin una cita previa.',
        status: 403,
      };
    }
  }
  return { ok: true };
}

export async function loadMensajesConversacion(
  auth: SessionUsuario,
  destinatarioId: number,
): Promise<
  | { mensajes: ChatMensaje[]; miId: number }
  | { error: string; status: number }
> {
  if (!isDatabaseConfigured()) {
    return { error: 'Base de datos no configurada', status: 503 };
  }

  if (!Number.isFinite(destinatarioId) || destinatarioId <= 0) {
    return { mensajes: [], miId: auth.id };
  }

  if (normalizeRol(auth.rol) === 'psicologo') {
    const gate = await assertCanMessage(auth, destinatarioId);
    if (!gate.ok) return { error: gate.error, status: gate.status };
  }

  const result = await query(
    `SELECT * FROM mensajes
     WHERE (remitente_id = $1 AND destinatario_id = $2)
        OR (remitente_id = $2 AND destinatario_id = $1)
     ORDER BY fecha_envio ASC`,
    [auth.id, destinatarioId],
  );

  const mensajes = result.rows.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      ...r,
      contenido: decryptMensajeContenido(String(r.contenido ?? '')),
    } as ChatMensaje;
  });

  await query(
    `UPDATE mensajes SET leido = true
     WHERE destinatario_id = $1 AND remitente_id = $2 AND (leido IS NULL OR leido = false)`,
    [auth.id, destinatarioId],
  );

  return { mensajes, miId: auth.id };
}

export async function enviarMensajeTexto(
  auth: SessionUsuario,
  destinatarioId: number,
  contenido: string,
): Promise<{ success: true } | { error: string; status: number }> {
  if (!isDatabaseConfigured()) {
    return { error: 'Base de datos no configurada', status: 503 };
  }

  if (!destinatarioId || Number.isNaN(destinatarioId)) {
    return { error: 'destinatarioId inválido', status: 400 };
  }

  const gate = await assertCanMessage(auth, destinatarioId);
  if (!gate.ok) return { error: gate.error, status: gate.status };

  await query(
    'INSERT INTO mensajes (remitente_id, destinatario_id, contenido) VALUES ($1, $2, $3)',
    [auth.id, destinatarioId, encryptMensajeContenido(contenido)],
  );

  enviarCorreoNotificacionChatSiAplica(destinatarioId, auth.id).catch((e) =>
    console.error('Notif chat:', (e as Error).message),
  );

  return { success: true };
}

export async function enviarMensajeAdjunto(
  auth: SessionUsuario,
  destinatarioId: number,
  file: File,
): Promise<{ success: true } | { error: string; status: number }> {
  if (!isDatabaseConfigured()) {
    return { error: 'Base de datos no configurada', status: 503 };
  }

  if (!destinatarioId) {
    return { error: 'Falta destinatarioId', status: 400 };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: 'Archivo demasiado grande (máx. 10 MB)', status: 400 };
  }

  let nombreOriginal = (file.name || 'documento.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!nombreOriginal.toLowerCase().endsWith('.pdf')) {
    nombreOriginal += '.pdf';
  }

  const mimeOk =
    file.type === 'application/pdf' || nombreOriginal.toLowerCase().endsWith('.pdf');
  if (!mimeOk) {
    return { error: 'Solo se permiten archivos PDF en el chat.', status: 400 };
  }

  const gate = await assertCanMessage(auth, destinatarioId);
  if (!gate.ok) return { error: gate.error, status: gate.status };

  const buffer = Buffer.from(await file.arrayBuffer());
  const nombreGuardado = `${Date.now()}-${nombreOriginal}`;
  const objectKey = `${auth.id}/${nombreGuardado}`;
  const uploaded = await storageUpload(
    STORAGE_BUCKETS.chatAttachments,
    objectKey,
    buffer,
    'application/pdf',
  );

  await query(
    'INSERT INTO mensajes (remitente_id, destinatario_id, contenido, ruta_adjunto, nombre_adjunto) VALUES ($1, $2, $3, $4, $5)',
    [
      auth.id,
      destinatarioId,
      encryptMensajeContenido('[PDF adjunto]'),
      uploaded.storedPath,
      file.name || nombreOriginal,
    ],
  );

  enviarCorreoNotificacionChatSiAplica(destinatarioId, auth.id).catch((e) =>
    console.error('Notif chat:', (e as Error).message),
  );

  return { success: true };
}

export async function countMensajesNoLeidos(auth: SessionUsuario): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  const r = await query(
    `SELECT COUNT(*)::int AS total FROM mensajes
     WHERE destinatario_id = $1 AND (leido IS NULL OR leido = false)`,
    [auth.id],
  );
  return (r.rows[0] as { total?: number } | undefined)?.total ?? 0;
}

export async function mensajesNoLeidosPorContacto(
  auth: SessionUsuario,
): Promise<Record<string, number>> {
  if (!isDatabaseConfigured()) return {};

  const r = await query(
    `SELECT remitente_id, COUNT(*)::int AS total FROM mensajes
     WHERE destinatario_id = $1 AND (leido IS NULL OR leido = false)
     GROUP BY remitente_id`,
    [auth.id],
  );

  const porContacto: Record<string, number> = {};
  (r.rows as { remitente_id: number; total: number }[]).forEach((row) => {
    if (row.remitente_id != null) {
      porContacto[String(row.remitente_id)] = row.total || 0;
    }
  });
  return porContacto;
}
