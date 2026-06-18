import { NextResponse } from 'next/server';
import { databaseUnavailableJson, requireAuthUsuario } from '@/lib/auth/api';
import { cancelarCita } from '@/lib/citas/service';
import { isDatabaseConfigured } from '@/lib/db';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Falta cita_id' }, { status: 400 });
  }

  const citaId = Number(body.cita_id);
  if (!citaId) {
    return NextResponse.json({ error: 'Falta cita_id' }, { status: 400 });
  }

  try {
    const result = await cancelarCita({ pacienteId: auth.id, citaId });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      reembolso_solicitado: result.reembolso_solicitado,
    });
  } catch (error) {
    console.error('POST cancelar-cita:', error);
    const msg = (error as Error).message || '';
    if (
      msg.includes('stripe_payment_intent_id') ||
      msg.includes('does not exist')
    ) {
      return NextResponse.json(
        {
          error:
            'Ejecuta la migración add_stripe_payment_intent_id_citas.sql para habilitar reembolsos.',
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: 'Error al cancelar cita' },
      { status: 500 },
    );
  }
}
