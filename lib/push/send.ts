import webpush from 'web-push';
import { getBaseUrl } from '@/lib/config';
import { query } from '@/lib/db';
import {
  deletePushSubscriptionByEndpoint,
  listPushSubscriptionsForUsuario,
} from '@/lib/push/subscriptions';
import {
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
  isWebPushConfigured,
} from '@/lib/push/vapid';

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (!isWebPushConfigured()) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(
      getVapidSubject(),
      getVapidPublicKey()!,
      getVapidPrivateKey()!,
    );
    vapidConfigured = true;
  }
  return true;
}

async function sendToUsuario(
  usuarioId: number,
  payload: PushPayload,
): Promise<number> {
  if (!ensureVapid() || !usuarioId) return 0;

  const subs = await listPushSubscriptionsForUsuario(usuarioId);
  if (!subs.length) return 0;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || `${getBaseUrl()}/login`,
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 },
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await deletePushSubscriptionByEndpoint(sub.endpoint).catch(() => {});
        } else {
          console.error(
            '[push] error enviando a usuario',
            usuarioId,
            (err as Error).message,
          );
        }
      }
    }),
  );
  return sent;
}

/** Nuevo mensaje de chat (mismo destinatario que el correo/WhatsApp). */
export async function enviarPushNotificacionChat(
  destinatarioId: number,
  nombreRemitente: string,
): Promise<void> {
  try {
    const primerNombre = (nombreRemitente || 'Alguien').trim() || 'Alguien';
    await sendToUsuario(destinatarioId, {
      title: 'Nuevo mensaje',
      body: `${primerNombre} te escribió en Psicólogos en Red.`,
      url: `${getBaseUrl()}/login`,
    });
  } catch (e) {
    console.error('[push] chat:', (e as Error).message);
  }
}

/** Recordatorio ~30 min antes: paciente (usuario_id) y psicólogo (usuario_id). */
export async function enviarPushRecordatorioCita(params: {
  pacienteUsuarioId: number;
  psicologoId: number;
  psicologoNombre?: string;
  pacienteNombre?: string;
}): Promise<void> {
  try {
    const psiRow = await query<{ usuario_id: number | null }>(
      'SELECT usuario_id FROM psicologos WHERE id = $1 LIMIT 1',
      [params.psicologoId],
    );
    const psicologoUsuarioId = psiRow.rows[0]?.usuario_id ?? null;
    const psiNombre = (params.psicologoNombre || 'tu psicólogo').trim();
    const pacNombre = (params.pacienteNombre || 'tu paciente').trim();
    const loginUrl = `${getBaseUrl()}/login`;

    await sendToUsuario(params.pacienteUsuarioId, {
      title: 'Recordatorio de sesión',
      body: `Tu sesión con ${psiNombre} es en unos 30 minutos.`,
      url: loginUrl,
    });

    if (psicologoUsuarioId) {
      await sendToUsuario(psicologoUsuarioId, {
        title: 'Recordatorio de sesión',
        body: `Sesión con ${pacNombre} en unos 30 minutos.`,
        url: loginUrl,
      });
    }
  } catch (e) {
    console.error('[push] recordatorio cita:', (e as Error).message);
  }
}
