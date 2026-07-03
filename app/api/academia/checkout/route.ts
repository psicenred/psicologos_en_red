import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { isAcademiaFreeEnrollmentEnabled } from '@/lib/academia/config';
import { getPublishedCourseBySlug } from '@/lib/academia/courses';
import { createPendingEnrollment, enrollStudentWithoutPayment } from '@/lib/academia/enrollments';
import { resolveEnrollmentCohortId } from '@/lib/academia/cohorts';
import { createCourseCheckoutSession } from '@/lib/academia/payments';
import { getBaseUrl } from '@/lib/config';
import type { PaymentPlan } from '@/lib/academia/types';

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session) {
    return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 });
  }
  if (session.role !== 'student') {
    return NextResponse.json(
      { error: 'Solo los alumnos pueden inscribirse a cursos' },
      { status: 403 },
    );
  }

  const body = await request.json();
  const slug = String(body.slug ?? '').trim();
  const paymentPlan = (body.paymentPlan === 'monthly' ? 'monthly' : 'full') as PaymentPlan;
  const cohortId = body.cohortId ? String(body.cohortId) : undefined;

  if (!slug) {
    return NextResponse.json({ error: 'Curso no especificado' }, { status: 400 });
  }

  const course = await getPublishedCourseBySlug(slug);
  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  const freeEnrollment = isAcademiaFreeEnrollmentEnabled();

  if (course.format === 'sync') {
    let resolvedCohortId: string;
    try {
      resolvedCohortId = await resolveEnrollmentCohortId(course.id, cohortId);
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }

    if (freeEnrollment) {
      try {
        await enrollStudentWithoutPayment(session.userId, course.id, {
          cohortId: resolvedCohortId,
          paymentPlan,
        });
        return NextResponse.json({
          free: true,
          url: `${getBaseUrl()}/cursos/alumno/${course.id}?enrolled=1`,
        });
      } catch (err) {
        return NextResponse.json({ error: (err as Error).message }, { status: 400 });
      }
    }

    const amount =
      paymentPlan === 'monthly' ? course.price_monthly : course.price_full;
    if (amount == null || amount <= 0) {
      return NextResponse.json({ error: 'Precio no configurado para este plan' }, { status: 400 });
    }

    const { enrollment, payment } = await createPendingEnrollment(
      session.userId,
      course.id,
      amount,
      { cohortId: resolvedCohortId, paymentPlan },
    );

    const checkout = await createCourseCheckoutSession({
      courseTitle: course.title,
      courseSlug: course.slug,
      amountMxn: amount,
      paymentId: payment.id,
      enrollmentId: enrollment.id,
      studentId: session.userId,
      courseId: course.id,
      paymentPlan,
      cohortId: resolvedCohortId,
    });

    return NextResponse.json({ url: checkout.url });
  }

  if (course.format !== 'async') {
    return NextResponse.json({ error: 'Formato de curso no soportado' }, { status: 400 });
  }

  if (paymentPlan === 'monthly') {
    return NextResponse.json(
      { error: 'El plan mensual solo aplica a cursos síncronos' },
      { status: 400 },
    );
  }

  if (freeEnrollment) {
    try {
      await enrollStudentWithoutPayment(session.userId, course.id, { paymentPlan: 'full' });
      return NextResponse.json({
        free: true,
        url: `${getBaseUrl()}/cursos/alumno/${course.id}?enrolled=1`,
      });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 400 });
    }
  }

  const amount = course.price_full;
  if (amount == null || amount <= 0) {
    return NextResponse.json({ error: 'Precio no configurado' }, { status: 400 });
  }

  const { enrollment, payment } = await createPendingEnrollment(
    session.userId,
    course.id,
    amount,
    { paymentPlan: 'full' },
  );

  const checkout = await createCourseCheckoutSession({
    courseTitle: course.title,
    courseSlug: course.slug,
    amountMxn: amount,
    paymentId: payment.id,
    enrollmentId: enrollment.id,
    studentId: session.userId,
    courseId: course.id,
    paymentPlan: 'full',
  });

  return NextResponse.json({ url: checkout.url });
}
