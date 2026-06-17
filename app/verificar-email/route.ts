import { databaseUnavailableResponse } from '@/lib/auth/api';
import { ensureDb, verifyEmailToken } from '@/lib/auth/service';

export async function GET(request: Request) {
  if (!ensureDb()) return databaseUnavailableResponse();

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') ?? '';
    return verifyEmailToken(token);
  } catch (error) {
    console.error('GET /verificar-email:', error);
    return new Response('Error al verificar el correo.', { status: 500 });
  }
}
