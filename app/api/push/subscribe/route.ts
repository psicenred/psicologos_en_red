import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAuthUsuario,
} from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';
import { upsertPushSubscription } from '@/lib/push/subscriptions';
import { isWebPushConfigured } from '@/lib/push/vapid';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: 'Web Push no configurado' },
      { status: 503 },
    );
  }

  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  const body = await parseJsonBody<{
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  }>(request);

  const endpoint = String(body.endpoint || '').trim();
  const p256dh = String(body.keys?.p256dh || '').trim();
  const authKey = String(body.keys?.auth || '').trim();

  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json(
      { error: 'Suscripción incompleta' },
      { status: 400 },
    );
  }

  if (endpoint.length > 2048 || p256dh.length > 512 || authKey.length > 256) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
  }

  try {
    await upsertPushSubscription({
      usuarioId: auth.id,
      endpoint,
      p256dh,
      auth: authKey,
      userAgent: request.headers.get('user-agent'),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/push/subscribe:', error);
    return NextResponse.json(
      { error: 'No se pudo guardar la suscripción' },
      { status: 500 },
    );
  }
}
