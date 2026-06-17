import { NextResponse } from 'next/server';
import { getJaasAppId } from '@/lib/jaas';

export async function GET() {
  return NextResponse.json({ appId: getJaasAppId() });
}
