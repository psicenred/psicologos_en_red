import { NextResponse } from 'next/server';
import { requireAuthUsuario, databaseUnavailableJson } from '@/lib/auth/api';
import { handleStripeCheckoutCompleted } from '@/lib/citas/service';
import { isDatabaseConfigured } from '@/lib/db';
import { getStripe } from '@/lib/stripe';

/** Respaldo: crea la cita si el webhook de Stripe no llegó tras el pago. */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;

  let body: { session_id?: string } = {};
  try {
    body = (await request.json()) as { session_id?: string };
  } catch {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }

  const sessionId = body.session_id?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: 'session_id requerido' }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Pagos no configurados' }, { status: 503 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Pago no completado' }, { status: 400 });
    }
    if (session.metadata?.paciente_id !== String(auth.id)) {
      return NextResponse.json(
        { error: 'Esta sesión de pago no corresponde a tu cuenta' },
        { status: 403 },
      );
    }

    await handleStripeCheckoutCompleted(session);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/confirmar-pago-stripe:', err);
    return NextResponse.json(
      { error: 'No se pudo confirmar el pago. Intenta de nuevo en unos segundos.' },
      { status: 500 },
    );
  }
}
