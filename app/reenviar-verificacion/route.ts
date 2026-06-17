import { NextResponse } from 'next/server';
import { databaseUnavailableResponse } from '@/lib/auth/api';
import { ensureDb, resendVerificationEmail } from '@/lib/auth/service';

export async function GET(request: Request) {
  if (!ensureDb()) return databaseUnavailableResponse();

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') ?? '';
    const result = await resendVerificationEmail(email);

    if ('redirect' in result && result.redirect) {
      return NextResponse.redirect(new URL(result.redirect, request.url));
    }

    return result as Response;
  } catch (error) {
    console.error('GET /reenviar-verificacion:', error);
    return new Response('Error al reenviar el correo de verificación.', {
      status: 500,
    });
  }
}
