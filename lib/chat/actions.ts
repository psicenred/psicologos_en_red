'use server';

import { requireSessionUsuario } from '@/lib/auth/server-session';
import {
  countMensajesNoLeidos,
  enviarMensajeAdjunto,
  enviarMensajeTexto,
  loadMensajesConversacion,
  mensajesNoLeidosPorContacto,
  type ChatMensaje,
} from '@/lib/chat/service';

export type ChatActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function loadMensajesAction(
  destinatarioId: number,
): Promise<
  ChatActionResult<{ mensajes: ChatMensaje[]; miId: number }>
> {
  const auth = await requireSessionUsuario();
  if (!auth) return { ok: false, error: 'No autorizado' };

  const result = await loadMensajesConversacion(auth, destinatarioId);
  if ('error' in result) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: result };
}

export async function enviarMensajeAction(
  destinatarioId: number,
  contenido: string,
): Promise<ChatActionResult<{ success: true }>> {
  const auth = await requireSessionUsuario();
  if (!auth) return { ok: false, error: 'No autorizado' };

  const result = await enviarMensajeTexto(auth, destinatarioId, contenido);
  if ('error' in result) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: { success: true } };
}

export async function enviarAdjuntoChatAction(
  formData: FormData,
): Promise<ChatActionResult<{ success: true }>> {
  const auth = await requireSessionUsuario();
  if (!auth) return { ok: false, error: 'No autorizado' };

  const file = formData.get('archivo');
  const destinatarioId = parseInt(String(formData.get('destinatarioId')), 10);

  if (!file || !(file instanceof File)) {
    return { ok: false, error: 'No se recibió ningún archivo PDF' };
  }

  const result = await enviarMensajeAdjunto(auth, destinatarioId, file);
  if ('error' in result) {
    return { ok: false, error: result.error };
  }
  return { ok: true, data: { success: true } };
}

export async function mensajesNoLeidosAction(): Promise<
  ChatActionResult<{ count: number }>
> {
  const auth = await requireSessionUsuario();
  if (!auth) return { ok: false, error: 'No autorizado' };

  const count = await countMensajesNoLeidos(auth);
  return { ok: true, data: { count } };
}

export async function mensajesNoLeidosPorContactoAction(): Promise<
  ChatActionResult<Record<string, number>>
> {
  const auth = await requireSessionUsuario();
  if (!auth) return { ok: false, error: 'No autorizado' };

  const data = await mensajesNoLeidosPorContacto(auth);
  return { ok: true, data };
}
