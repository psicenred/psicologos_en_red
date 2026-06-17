import { NextResponse } from 'next/server';

export function verifyCronSecret(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET no configurado' },
      { status: 503 },
    );
  }
  const header = request.headers.get('x-cron-secret');
  if (header !== secret) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  return null;
}
