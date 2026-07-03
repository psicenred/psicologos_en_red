import { NextResponse } from 'next/server';
import { getAcademiaSession } from '@/lib/academia/auth';
import { getCourseById } from '@/lib/academia/courses';
import { createMonthlyPaymentCheckout } from '@/lib/academia/payments';
import { getSupabaseServiceClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const session = await getAcademiaSession();
  if (!session || session.role !== 'student') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();
  const paymentId = String(body.paymentId ?? '').trim();
  if (!paymentId) {
    return NextResponse.json({ error: 'Pago no especificado' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();
  const { data: payment, error } = await db
    .from('course_payments')
    .select('id, amount, status, enrollment_id')
    .eq('id', paymentId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!payment) {
    return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
  }

  const { data: enrollment, error: enrErr } = await db
    .from('course_enrollments')
    .select('id, student_id, course_id')
    .eq('id', payment.enrollment_id)
    .maybeSingle();

  if (enrErr) return NextResponse.json({ error: enrErr.message }, { status: 500 });
  if (!enrollment || enrollment.student_id !== session.userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  if (!['pending', 'overdue'].includes(payment.status)) {
    return NextResponse.json({ error: 'Este pago ya fue procesado' }, { status: 400 });
  }

  const course = await getCourseById(enrollment.course_id);
  if (!course) {
    return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 });
  }

  const checkout = await createMonthlyPaymentCheckout({
    courseTitle: course.title,
    courseSlug: course.slug,
    amountMxn: Number(payment.amount),
    paymentId: payment.id,
    enrollmentId: enrollment.id,
    studentId: session.userId,
    courseId: course.id,
    installmentLabel: `Cuota — ${course.title}`,
  });

  return NextResponse.json({ url: checkout.url });
}
