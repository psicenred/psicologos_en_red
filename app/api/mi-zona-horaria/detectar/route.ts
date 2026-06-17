import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requirePsicologo,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';
import { getTimezoneFromIpAsync } from '@/lib/geo';
import { getPsicologoIdFromUsuarioId } from '@/lib/psicologo/id';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologo();
  if (auth instanceof NextResponse) return auth;

  try {
    const psicologoId = await getPsicologoIdFromUsuarioId(auth.id);
    if (!psicologoId) {
      return NextResponse.json(
        { error: 'Perfil de psicólogo no encontrado' },
        { status: 404 },
      );
    }

    const body = await parseJsonBody<{ zona_horaria?: string }>(request);
    const desdeNavegador =
      typeof body.zona_horaria === 'string' &&
      body.zona_horaria.trim().length > 0 &&
      body.zona_horaria.includes('/');
    const zona = desdeNavegador
      ? body.zona_horaria!.trim().slice(0, 64)
      : ((await getTimezoneFromIpAsync(request)) || 'America/Mexico_City').slice(
          0,
          64,
        );

    try {
      await query(
        `UPDATE psicologos SET zona_horaria = $1, zona_horaria_actualizada_at = NOW() WHERE id = $2`,
        [zona, psicologoId],
      );
    } catch (e2) {
      const msg = (e2 as Error).message || '';
      if (msg.includes('zona_horaria_actualizada_at')) {
        await query('UPDATE psicologos SET zona_horaria = $1 WHERE id = $2', [
          zona,
          psicologoId,
        ]);
      } else {
        throw e2;
      }
    }

    return NextResponse.json({ success: true, zona_horaria: zona });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (msg.includes('zona_horaria')) {
      return NextResponse.json(
        {
          error:
            'Ejecuta la migración add_zona_horaria_citas_psicologos.sql',
        },
        { status: 500 },
      );
    }
    console.error('POST /api/mi-zona-horaria/detectar:', msg);
    return NextResponse.json(
      { error: 'No se pudo detectar la zona horaria' },
      { status: 500 },
    );
  }
}
