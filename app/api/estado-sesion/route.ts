import { NextResponse } from 'next/server';
import { getPublicSessionState } from '@/lib/auth/public-session';

export async function GET() {
  const session = await getPublicSessionState();
  return NextResponse.json(session);
}
