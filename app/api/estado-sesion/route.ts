import { NextResponse } from 'next/server';
import { getPublicSessionState } from '@/lib/auth/public-session';

export async function GET(request: Request) {
  const session = await getPublicSessionState(request);
  return NextResponse.json(session);
}
