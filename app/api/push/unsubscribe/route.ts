import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAuthUsuario,
} from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';
import { deletePushSubscriptionByEndpoint } from '@/lib/push/subscriptions';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  const body = await parseJsonBody<{ endpoint?: string }>(request);
  const endpoint = String(body.endpoint || '').trim();
  if (!endpoint) {
    return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 });
  }

  try {
    await deletePushSubscriptionByEndpoint(endpoint, auth.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/push/unsubscribe:', error);
    return NextResponse.json(
      { error: 'No se pudo eliminar la suscripción' },
      { status: 500 },
    );
  }
}
