import { getStripe } from '@/lib/stripe';
import { getBaseUrl } from '@/lib/config';
import type { PaymentPlan } from '@/lib/academia/types';

type CheckoutBase = {
  courseTitle: string;
  courseSlug: string;
  amountMxn: number;
  paymentId: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  paymentPlan: PaymentPlan;
  cohortId?: string;
};

export async function createCourseCheckoutSession(params: CheckoutBase) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe no configurado');
  }

  const baseUrl = getBaseUrl();
  const amountCents = Math.round(params.amountMxn * 100);
  const label =
    params.paymentPlan === 'monthly'
      ? `Mensualidad 1 — ${params.courseTitle}`
      : `Inscripción — ${params.courseTitle}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: label,
            description: params.courseTitle,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'course_enrollment',
      payment_id: params.paymentId,
      enrollment_id: params.enrollmentId,
      student_id: params.studentId,
      course_id: params.courseId,
      course_slug: params.courseSlug,
      payment_plan: params.paymentPlan,
      cohort_id: params.cohortId ?? '',
      monthly_amount: params.paymentPlan === 'monthly' ? String(params.amountMxn) : '',
    },
    success_url: `${baseUrl}/cursos/alumno?checkout=success&course=${params.courseSlug}`,
    cancel_url: `${baseUrl}/academia/${params.courseSlug}?checkout=cancelled`,
  });

  if (!session.url) {
    throw new Error('No se pudo crear la sesión de pago');
  }

  return session;
}

export async function createMonthlyPaymentCheckout(params: {
  courseTitle: string;
  courseSlug: string;
  amountMxn: number;
  paymentId: string;
  enrollmentId: string;
  studentId: string;
  courseId: string;
  installmentLabel?: string;
}) {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe no configurado');
  }

  const baseUrl = getBaseUrl();
  const amountCents = Math.round(params.amountMxn * 100);
  const label = params.installmentLabel ?? `Mensualidad — ${params.courseTitle}`;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: label,
            description: params.courseTitle,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      type: 'course_enrollment',
      is_installment: 'true',
      payment_id: params.paymentId,
      enrollment_id: params.enrollmentId,
      student_id: params.studentId,
      course_id: params.courseId,
      course_slug: params.courseSlug,
      payment_plan: 'monthly',
    },
    success_url: `${baseUrl}/cursos/alumno?checkout=success&course=${params.courseSlug}`,
    cancel_url: `${baseUrl}/cursos/alumno?checkout=cancelled`,
  });

  if (!session.url) {
    throw new Error('No se pudo crear la sesión de pago');
  }

  return session;
}
