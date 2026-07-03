import type { CourseAssignment, CourseExam } from '@/lib/academia/types';

export function totalEvaluationWeight(
  exams: CourseExam[],
  assignments: CourseAssignment[],
  attendanceWeightPct = 0,
): number {
  const evalWeight =
    exams.reduce((n, e) => n + Number(e.weight_pct), 0) +
    assignments.reduce((n, a) => n + Number(a.weight_pct), 0);
  return Math.round((evalWeight + Number(attendanceWeightPct)) * 100) / 100;
}

export function isWeightBalanced(total: number): boolean {
  return Math.abs(total - 100) < 0.01;
}
