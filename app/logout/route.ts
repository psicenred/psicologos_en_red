import { NextResponse } from 'next/server';
import { destroySessionOnResponse } from '@/lib/session';

export async function GET(request: Request) {
  const loginUrl = new URL('/login', request.url);
  const response = NextResponse.redirect(loginUrl, 303);
  response.headers.set('Cache-Control', 'no-store');
  await destroySessionOnResponse(request, response);
  return response;
}
