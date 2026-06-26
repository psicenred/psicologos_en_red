import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  forbiddenJson,
  parseJsonBody,
  requireAuthUsuario,
} from '@/lib/auth/api';
import { resolveCitaParticipantRole } from '@/lib/citas/access';
import { createDailyMeeting } from '@/lib/daily';
import { isDatabaseConfigured } from '@/lib/db';
import { logSecurityEvent } from '@/lib/security/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await parseJsonBody<{
      citaId?: unknown;
      displayName?: string;
    }>(request);

    const citaId = parseInt(String(body.citaId ?? ''), 10);
    if (Number.isNaN(citaId) || citaId <= 0) {
      return NextResponse.json({ error: 'citaId inválido' }, { status: 400 });
    }

    const participantRol = await resolveCitaParticipantRole(
      auth.id,
      auth.rol,
      citaId,
    );
    if (!participantRol) {
      logSecurityEvent('access_denied', 'Intento de videollamada sin permiso', {
        userId: auth.id,
        citaId,
      });
      return forbiddenJson('No tienes acceso a esta videollamada');
    }

    const result = await createDailyMeeting({
      citaId,
      rol: participantRol,
      displayName: body.displayName ? String(body.displayName) : undefined,
      userId: auth.id,
      userName: auth.nombre,
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/daily-meeting:', err);
    return NextResponse.json(
      { error: 'No se pudo preparar la videollamada' },
      { status: 500 },
    );
  }
}
