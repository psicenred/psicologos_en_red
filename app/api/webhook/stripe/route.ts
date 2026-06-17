import { NextResponse } from 'next/server';
import { handleStripeCheckoutCompleted } from '@/lib/citas/service';
import { getStripe } from '@/lib/stripe';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const stripe = getStripe();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !endpointSecret || !process.env.STRIPE_SECRET_KEY) {
    return new NextResponse('Webhook no configurado', { status: 400 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new NextResponse('Missing stripe-signature', { status: 400 });
  }

  const body = await request.text();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return new NextResponse(
      `Webhook Error: ${(err as Error).message}`,
      { status: 400 },
    );
  }

  if (event.type === 'checkout.session.completed') {
    try {
      await handleStripeCheckoutCompleted(event.data.object);
    } catch (err) {
      console.error('Error creando cita desde webhook:', err);
      return new NextResponse('Error processing webhook', { status: 500 });
    }
  }

  return new NextResponse(null, { status: 200 });
}
