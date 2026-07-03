import { getSupabaseServiceClient } from '@/lib/supabase';
import type { CourseEnrollment, CoursePayment, PaymentPlan } from '@/lib/academia/types';
import { countCohortEnrollments, resolveEnrollmentCohortId } from '@/lib/academia/cohorts';
import { getCourseById } from '@/lib/academia/courses';

export async function getStudentEnrollments(studentId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_enrollments')
    .select(
      `
      *,
      course:course_courses(id, title, slug, thumbnail_url, format, status)
    `,
    )
    .eq('student_id', studentId)
    .order('enrolled_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEnrollment(
  studentId: string,
  courseId: string,
): Promise<CourseEnrollment | null> {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_enrollments')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as CourseEnrollment | null) ?? null;
}

export async function createPendingEnrollment(
  studentId: string,
  courseId: string,
  amount: number,
  options?: {
    cohortId?: string;
    paymentPlan?: PaymentPlan;
  },
): Promise<{ enrollment: CourseEnrollment; payment: CoursePayment }> {
  const db = getSupabaseServiceClient();
  const paymentPlan = options?.paymentPlan ?? 'full';
  let cohortId = options?.cohortId ?? null;

  const course = await getCourseById(courseId);
  if (!course) throw new Error('Curso no encontrado');

  if (course.format === 'sync') {
    cohortId = await resolveEnrollmentCohortId(courseId, cohortId);
  }

  if (cohortId) {
    const enrolled = await countCohortEnrollments(cohortId);
    if (enrolled >= course.max_students) {
      throw new Error('Esta cohorte ya alcanzó el cupo máximo');
    }
  }

  const existing = await getEnrollment(studentId, courseId);
  if (existing?.status === 'active') {
    throw new Error('Ya estás inscrito en este curso');
  }

  let enrollmentId = existing?.id;

  if (!enrollmentId) {
    const { data: enrollment, error: enrErr } = await db
      .from('course_enrollments')
      .insert({
        student_id: studentId,
        course_id: courseId,
        cohort_id: cohortId,
        payment_plan: paymentPlan,
        status: 'paused',
      })
      .select('*')
      .single();

    if (enrErr) throw new Error(enrErr.message);
    enrollmentId = enrollment.id;
  } else {
    await db
      .from('course_enrollments')
      .update({
        status: 'paused',
        payment_plan: paymentPlan,
        cohort_id: cohortId,
      })
      .eq('id', enrollmentId);
  }

  const { data: payment, error: payErr } = await db
    .from('course_payments')
    .insert({
      enrollment_id: enrollmentId,
      amount,
      status: 'pending',
      due_date: new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single();

  if (payErr) throw new Error(payErr.message);

  const { data: enrollment } = await db
    .from('course_enrollments')
    .select('*')
    .eq('id', enrollmentId)
    .single();

  return {
    enrollment: enrollment as CourseEnrollment,
    payment: payment as CoursePayment,
  };
}

export async function enrollStudentWithoutPayment(
  studentId: string,
  courseId: string,
  options?: {
    cohortId?: string;
    paymentPlan?: PaymentPlan;
  },
): Promise<CourseEnrollment> {
  const paymentPlan = options?.paymentPlan ?? 'full';

  const { enrollment, payment } = await createPendingEnrollment(studentId, courseId, 0, {
    cohortId: options?.cohortId,
    paymentPlan,
  });

  await activateEnrollmentAfterPayment(`free_${payment.id}`, payment.id, enrollment.id, {
    paymentPlan,
    courseId,
  });

  const updated = await getEnrollment(studentId, courseId);
  if (!updated) throw new Error('No se pudo activar la inscripción');
  return updated;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function scheduleRemainingMonthlyPayments(
  enrollmentId: string,
  courseId: string,
  monthlyAmount: number,
) {
  const course = await getCourseById(courseId);
  if (!course || course.duration_months <= 1) return;

  const db = getSupabaseServiceClient();
  const today = new Date();

  const rows = [];
  for (let month = 2; month <= course.duration_months; month += 1) {
    const due = addMonths(today, month - 1);
    rows.push({
      enrollment_id: enrollmentId,
      amount: monthlyAmount,
      status: 'pending' as const,
      due_date: due.toISOString().slice(0, 10),
    });
  }

  if (rows.length) {
    const { error } = await db.from('course_payments').insert(rows);
    if (error) throw new Error(error.message);
  }
}

export async function completeInstallmentPayment(stripeSessionId: string, paymentId: string) {
  const db = getSupabaseServiceClient();
  const now = new Date().toISOString();

  const { data: payment, error: fetchErr } = await db
    .from('course_payments')
    .select('enrollment_id')
    .eq('id', paymentId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);
  if (!payment) throw new Error('Pago no encontrado');

  const { error: payErr } = await db
    .from('course_payments')
    .update({
      status: 'paid',
      paid_at: now,
      stripe_payment_id: stripeSessionId,
    })
    .eq('id', paymentId);

  if (payErr) throw new Error(payErr.message);

  const { data: stillOverdue } = await db
    .from('course_payments')
    .select('id')
    .eq('enrollment_id', payment.enrollment_id)
    .in('status', ['overdue', 'pending'])
    .lt('due_date', new Date().toISOString().slice(0, 10))
    .limit(1);

  if (!stillOverdue?.length) {
    await db
      .from('course_enrollments')
      .update({ status: 'active' })
      .eq('id', payment.enrollment_id)
      .eq('status', 'payment_overdue');
  }
}

export async function activateEnrollmentAfterPayment(
  stripeSessionId: string,
  paymentId: string,
  enrollmentId: string,
  options?: { paymentPlan?: PaymentPlan; courseId?: string; monthlyAmount?: number },
) {
  const db = getSupabaseServiceClient();
  const now = new Date().toISOString();

  const { error: payErr } = await db
    .from('course_payments')
    .update({
      status: 'paid',
      paid_at: now,
      stripe_payment_id: stripeSessionId,
    })
    .eq('id', paymentId);

  if (payErr) throw new Error(payErr.message);

  const { error: enrErr } = await db
    .from('course_enrollments')
    .update({ status: 'active' })
    .eq('id', enrollmentId);

  if (enrErr) throw new Error(enrErr.message);

  if (
    options?.paymentPlan === 'monthly' &&
    options.courseId &&
    options.monthlyAmount != null
  ) {
    await scheduleRemainingMonthlyPayments(
      enrollmentId,
      options.courseId,
      options.monthlyAmount,
    );
  }
}

export async function getLessonProgress(studentId: string, courseId: string) {
  const db = getSupabaseServiceClient();
  const { data: modules } = await db
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId);

  if (!modules?.length) return [];

  const moduleIds = modules.map((m) => m.id);
  const { data: lessons } = await db
    .from('course_lessons')
    .select('id')
    .in('module_id', moduleIds);

  if (!lessons?.length) return [];

  const lessonIds = lessons.map((l) => l.id);
  const { data, error } = await db
    .from('course_lesson_progress')
    .select('*')
    .eq('student_id', studentId)
    .in('lesson_id', lessonIds);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markLessonComplete(studentId: string, lessonId: string) {
  const db = getSupabaseServiceClient();

  const { data: lesson } = await db
    .from('course_lessons')
    .select('module_id')
    .eq('id', lessonId)
    .maybeSingle();
  if (!lesson) throw new Error('Lección no encontrada');

  const { data: mod } = await db
    .from('course_modules')
    .select('course_id')
    .eq('id', lesson.module_id)
    .maybeSingle();
  if (!mod) throw new Error('Módulo no encontrado');

  const enrollment = await getEnrollment(studentId, mod.course_id);
  if (!enrollment || enrollment.status !== 'active') {
    throw new Error('Tu acceso al curso está pausado por pago pendiente');
  }

  const now = new Date().toISOString();
  const { error } = await db.from('course_lesson_progress').upsert(
    {
      student_id: studentId,
      lesson_id: lessonId,
      completed: true,
      completed_at: now,
    },
    { onConflict: 'student_id,lesson_id' },
  );

  if (error) throw new Error(error.message);
}

export function computeProgressPercent(
  totalLessons: number,
  completedCount: number,
): number {
  if (totalLessons === 0) return 0;
  return Math.round((completedCount / totalLessons) * 100);
}

export async function getEnrollmentPayments(enrollmentId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_payments')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('due_date', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CoursePayment[];
}
