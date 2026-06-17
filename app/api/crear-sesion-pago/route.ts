import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { crearSesionPago } from '@/lib/citas/service';
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
    const result = await crearSesionPago(request, {
      pacienteId: auth.id,
      psicologoId,
      fecha,
      hora,
      servicioInteres: body.servicio_interes
        ? String(body.servicio_interes)
        : undefined,
      motivoDeConsulta: body.motivo_de_consulta
        ? String(body.motivo_de_consulta)
        : undefined,
      currency: body.currency ? String(body.currency) : undefined,
      successUrl: body.success_url ? String(body.success_url) : undefined,
      cancelUrl: body.cancel_url ? String(body.cancel_url) : undefined,
      origenConocimiento: body.origen_conocimiento
        ? String(body.origen_conocimiento)
        : undefined,
      recomendadoPor: body.recomendado_por
        ? String(body.recomendado_por)
        : undefined,
    });

    if ('error' in result) {
      return NextResponse.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        { status: result.status },
      );
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error('POST crear-sesion-pago:', error);
    return NextResponse.json(
      { error: 'No se pudo iniciar el pago. Intenta de nuevo.' },
      { status: 500 },
    );
  }
}
