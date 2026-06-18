import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { reagendarCita } from '@/lib/citas/service';
import { isDatabaseConfigured } from '@/lib/db';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'Faltan datos para reagendar' },
      { status: 400 },
    );
  }

  const citaId = Number(body.cita_id);
  const fecha = String(body.fecha || '');
  const hora = String(body.hora || '');

  if (!citaId || !fecha || !hora) {
    return NextResponse.json(
      { error: 'Faltan datos para reagendar' },
      { status: 400 },
    );
  }

  try {
    const result = await reagendarCita({
      pacienteId: auth.id,
      citaId,
      fecha,
      hora,
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST reagendar-cita:', error);
    return NextResponse.json(
      { error: 'Error al reagendar cita' },
      { status: 500 },
    );
  }
}
