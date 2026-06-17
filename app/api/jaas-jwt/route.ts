import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';
import { createJaasJwt, getJaasAppId, limpiaEnv } from '@/lib/jaas';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  const appId = getJaasAppId();
  const kid = limpiaEnv(process.env.JAAS_KID);
  const privateKey = (process.env.JAAS_PRIVATE_KEY || '').trim();

  if (!appId || !kid || !privateKey) {
    return NextResponse.json(
      {
        error:
          'JaaS JWT no configurado (JAAS_APP_ID, JAAS_KID, JAAS_PRIVATE_KEY)',
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const displayName = (
    searchParams.get('displayName') ||
    auth.nombre ||
    'Usuario'
  ).trim();
  const moderator =
    searchParams.get('moderator') === 'true' ||
    searchParams.get('moderator') === '1';

  try {
    const token = createJaasJwt({
      userId: auth.id,
      displayName,
      email: auth.email || '',
      moderator,
    });
    return NextResponse.json({ jwt: token });
  } catch (error) {
    console.error('GET /api/jaas-jwt:', error);
    return NextResponse.json(
      { error: 'Error al generar token' },
      { status: 500 },
    );
  }
}
