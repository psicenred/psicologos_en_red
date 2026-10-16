import { query } from '@/lib/db';

export type PushSubscriptionRow = {
  id: number;
  usuario_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function upsertPushSubscription(params: {
  usuarioId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}): Promise<void> {
  await query(
    `INSERT INTO push_subscriptions (usuario_id, endpoint, p256dh, auth, user_agent, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (endpoint) DO UPDATE SET
       usuario_id = EXCLUDED.usuario_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent,
       updated_at = NOW()`,
    [
      params.usuarioId,
      params.endpoint,
      params.p256dh,
      params.auth,
      params.userAgent?.slice(0, 500) || null,
    ],
  );
}

export async function deletePushSubscriptionByEndpoint(
  endpoint: string,
  usuarioId?: number,
): Promise<void> {
  if (usuarioId != null) {
    await query(
      'DELETE FROM push_subscriptions WHERE endpoint = $1 AND usuario_id = $2',
      [endpoint, usuarioId],
    );
    return;
  }
  await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
}

export async function listPushSubscriptionsForUsuario(
  usuarioId: number,
): Promise<PushSubscriptionRow[]> {
  const res = await query<PushSubscriptionRow>(
    `SELECT id, usuario_id, endpoint, p256dh, auth
     FROM push_subscriptions WHERE usuario_id = $1`,
    [usuarioId],
  );
  return res.rows;
}
