import { getSupabaseServiceClient } from '@/lib/supabase';

const GRACE_DAYS = 5;

export async function processOverdueCoursePayments(): Promise<{
  markedOverdue: number;
  enrollmentsPaused: number;
}> {
  const db = getSupabaseServiceClient();
  const today = new Date();
  const graceCutoff = new Date(today);
  graceCutoff.setDate(graceCutoff.getDate() - GRACE_DAYS);
  const graceCutoffStr = graceCutoff.toISOString().slice(0, 10);

  const { data: overduePayments, error } = await db
    .from('course_payments')
    .select('id, enrollment_id, due_date')
    .eq('status', 'pending')
    .not('due_date', 'is', null)
    .lt('due_date', graceCutoffStr);

  if (error) throw new Error(error.message);
  if (!overduePayments?.length) {
    return { markedOverdue: 0, enrollmentsPaused: 0 };
  }

  const paymentIds = overduePayments.map((p) => p.id);
  const enrollmentIds = [...new Set(overduePayments.map((p) => p.enrollment_id))];

  await db.from('course_payments').update({ status: 'overdue' }).in('id', paymentIds);

  await db
    .from('course_enrollments')
    .update({ status: 'payment_overdue' })
    .in('id', enrollmentIds)
    .eq('status', 'active');

  return {
    markedOverdue: paymentIds.length,
    enrollmentsPaused: enrollmentIds.length,
  };
}
