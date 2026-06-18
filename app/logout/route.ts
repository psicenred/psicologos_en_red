import { NextResponse } from 'next/server';
import { destroySessionOnResponse } from '@/lib/session';

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  await destroySessionOnResponse(request, response);
  return response;
}
