import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requireAuthUsuario,
} from '@/lib/auth/api';
import { createDailyMeeting } from '@/lib/daily';
import { isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await parseJsonBody<{
      citaId?: unknown;
      rol?: string;
      displayName?: string;
    }>(request);

    const result = await createDailyMeeting({
      citaId: String(body.citaId ?? ''),
      rol: String(body.rol ?? ''),
      displayName: body.displayName ? String(body.displayName) : undefined,
      userId: auth.id,
      userName: auth.nombre,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/daily-meeting:', err);
    return NextResponse.json({
      error:
        (err as Error).message || 'Error inesperado al preparar la videollamada',
    });
  }
}
