import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { agendarCita } from '@/lib/citas/service';
import { isDatabaseConfigured } from '@/lib/db';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: 'Faltan datos para agendar' },
      { status: 400 },
    );
  }

  const psicologoId = Number(body.psicologo_id);
  const fecha = String(body.fecha || '');
  const hora = String(body.hora || '');

  if (!psicologoId || !fecha || !hora) {
    return NextResponse.json(
      { error: 'Faltan datos para agendar' },
      { status: 400 },
    );
  }

  try {
    const result = await agendarCita({
      pacienteId: auth.id,
      psicologoId,
      fecha,
      hora,
      motivoDeConsulta: body.motivo_de_consulta
        ? String(body.motivo_de_consulta)
        : null,
      origenConocimiento: body.origen_conocimiento
        ? String(body.origen_conocimiento)
        : null,
      recomendadoPor: body.recomendado_por
        ? String(body.recomendado_por)
        : null,
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Cita agendada correctamente',
    });
  } catch (error) {
    console.error('POST agendar-cita:', error);
    return NextResponse.json(
      { error: 'No se pudo agendar la cita' },
      { status: 500 },
    );
  }
}
