import { NextResponse } from 'next/server';
import {
  databaseUnavailableJson,
  parseJsonBody,
  requirePsicologo,
} from '@/lib/auth/api';
import { isDatabaseConfigured, query } from '@/lib/db';
import { getTimezoneFromIpAsync } from '@/lib/geo';
import { getPsicologoIdFromUsuarioId } from '@/lib/psicologo/id';

export async function GET(request: Request) {
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

    const r = await query('SELECT zona_horaria FROM psicologos WHERE id = $1', [
      psicologoId,
    ]);
    let zona = (r.rows[0] as { zona_horaria?: string } | undefined)
      ?.zona_horaria
      ? String(
          (r.rows[0] as { zona_horaria: string }).zona_horaria,
        ).trim()
      : '';

    if (!zona) {
      const tzIp = await getTimezoneFromIpAsync(request);
      zona =
        tzIp && tzIp.length <= 64 ? tzIp : 'America/Mexico_City';
      await query('UPDATE psicologos SET zona_horaria = $1 WHERE id = $2', [
        zona,
        psicologoId,
      ]);
    }

    return NextResponse.json({ zona_horaria: zona || 'America/Mexico_City' });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (msg.includes('zona_horaria')) {
      return NextResponse.json({ zona_horaria: 'America/Mexico_City' });
    }
    console.error('GET /api/mi-zona-horaria:', msg);
    return NextResponse.json(
      { error: 'Error al obtener zona horaria' },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const auth = await requirePsicologo();
  if (auth instanceof NextResponse) return auth;

  const body = await parseJsonBody<{ zona_horaria?: unknown }>(request);
  const zona =
    body.zona_horaria != null
      ? String(body.zona_horaria).trim().slice(0, 64)
      : '';
  const valor = zona || 'America/Mexico_City';

  try {
    const psicologoId = await getPsicologoIdFromUsuarioId(auth.id);
    if (!psicologoId) {
      return NextResponse.json(
        { error: 'Perfil de psicólogo no encontrado' },
        { status: 404 },
      );
    }

    try {
      await query(
        `UPDATE psicologos SET zona_horaria = $1, zona_horaria_actualizada_at = NOW() WHERE id = $2`,
        [valor, psicologoId],
      );
    } catch (e2) {
      const msg = (e2 as Error).message || '';
      if (msg.includes('zona_horaria_actualizada_at')) {
        await query('UPDATE psicologos SET zona_horaria = $1 WHERE id = $2', [
          valor,
          psicologoId,
        ]);
      } else {
        throw e2;
      }
    }

    return NextResponse.json({ success: true, zona_horaria: valor });
  } catch (e) {
    const msg = (e as Error).message || '';
    if (msg.includes('zona_horaria')) {
      return NextResponse.json(
        {
          error:
            'Ejecuta la migración add_zona_horaria_citas_psicologos.sql en la base de datos',
        },
        { status: 500 },
      );
    }
    console.error('PUT /api/mi-zona-horaria:', msg);
    return NextResponse.json(
      { error: 'Error al actualizar zona horaria' },
      { status: 500 },
    );
  }
}
