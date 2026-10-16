import { NextResponse } from 'next/server';
import { getVapidPublicKey, isWebPushConfigured } from '@/lib/push/vapid';

export async function GET() {
  if (!isWebPushConfigured()) {
    return NextResponse.json(
      { error: 'Web Push no configurado', configured: false },
      { status: 503 },
    );
  }
  return NextResponse.json({
    configured: true,
    publicKey: getVapidPublicKey(),
  });
}
