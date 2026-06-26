import { NextResponse } from 'next/server';
import { handleStripeCheckoutCompleted } from '@/lib/citas/service';
import { getStripe } from '@/lib/stripe';
import { logSecurityEvent } from '@/lib/security/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const stripe = getStripe();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !endpointSecret || !process.env.STRIPE_SECRET_KEY) {
    return new NextResponse('Webhook no configurado', { status: 400 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    logSecurityEvent('webhook_invalid', 'Stripe webhook sin firma');
    return new NextResponse('Missing stripe-signature', { status: 400 });
  }

  const body = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    logSecurityEvent('webhook_invalid', 'Stripe webhook firma inválida', {
      error: (err as Error).message,
    });
    return new NextResponse('Webhook Error', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    try {
      await handleStripeCheckoutCompleted(event.data.object);
    } catch (err) {
      logSecurityEvent('webhook_error', 'Error procesando checkout Stripe', {
        eventId: event.id,
        error: (err as Error).message,
      });
      return new NextResponse('Error processing webhook', { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
