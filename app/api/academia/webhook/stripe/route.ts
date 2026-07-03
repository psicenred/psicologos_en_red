import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  activateEnrollmentAfterPayment,
  completeInstallmentPayment,
} from '@/lib/academia/enrollments';
import { getStripe } from '@/lib/stripe';
import { logSecurityEvent } from '@/lib/security/logger';
import type { PaymentPlan } from '@/lib/academia/types';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const stripe = getStripe();
  const endpointSecret = process.env.STRIPE_ACADEMIA_WEBHOOK_SECRET?.trim()
    || process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!stripe || !endpointSecret || !process.env.STRIPE_SECRET_KEY) {
    return new NextResponse('Webhook no configurado', { status: 400 });
  }

  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new NextResponse('Missing stripe-signature', { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    logSecurityEvent('webhook_invalid', 'Stripe academia webhook firma inválida', {
      error: (err as Error).message,
    });
    return new NextResponse('Webhook Error', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.metadata?.type === 'course_enrollment') {
      const paymentId = session.metadata.payment_id;
      const enrollmentId = session.metadata.enrollment_id;
      const paymentPlan = (session.metadata.payment_plan || 'full') as PaymentPlan;
      const courseId = session.metadata.course_id;
      const monthlyAmount = session.metadata.monthly_amount
        ? Number(session.metadata.monthly_amount)
        : undefined;

      if (paymentId && enrollmentId && session.id) {
        try {
          if (session.metadata.is_installment === 'true') {
            await completeInstallmentPayment(session.id, paymentId);
          } else {
            await activateEnrollmentAfterPayment(session.id, paymentId, enrollmentId, {
              paymentPlan,
              courseId,
              monthlyAmount,
            });
          }
        } catch (err) {
          logSecurityEvent('webhook_error', 'Error activando inscripción academia', {
            error: (err as Error).message,
          });
          return new NextResponse('Error processing webhook', { status: 500 });
        }
      }
    }
  }

  return new NextResponse(null, { status: 200 });
}
