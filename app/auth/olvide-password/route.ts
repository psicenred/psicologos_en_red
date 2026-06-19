import { NextResponse } from 'next/server';
import { parseFormBody } from '@/lib/auth/api';
import { ensureDb, requestPasswordReset } from '@/lib/auth/service';

export async function POST(request: Request) {
  const msg =
    'Si el correo existe en nuestro sistema, recibirás instrucciones pronto.';
  const body = await parseFormBody(request).catch(
    (): Record<string, string> => ({}),
  );
  const email = body.email?.trim();

  const response = NextResponse.json({ message: msg });

  if (!email || !ensureDb()) return response;

  void requestPasswordReset(email)
    .then((result) => {
      if (!result.ok) console.error('[olvide-password]', result.code);
    })
    .catch((err) => {
      console.error('[olvide-password]', err);
    });

  return response;
}
