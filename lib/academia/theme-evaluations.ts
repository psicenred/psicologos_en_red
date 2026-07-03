import type { CourseAssignment, CourseExam } from '@/lib/academia/types';

export function formatThemeDate(iso: string | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(`${iso.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatEvalDueDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatThemeDateRange(start?: string, end?: string): string | null {
  const a = formatThemeDate(start);
  const b = formatThemeDate(end);
  if (a && b) return `${a} – ${b}`;
  return a ?? b;
}

/** Evaluaciones ligadas al tema (sin subtema) */
export function evaluationsForTheme(
  themeId: string,
  exams: CourseExam[],
  assignments: CourseAssignment[],
) {
  return {
    exams: exams.filter((e) => e.theme_id === themeId && !e.subtopic_id),
    assignments: assignments.filter((a) => a.theme_id === themeId && !a.subtopic_id),
  };
}

/** Evaluaciones ligadas a un subtema */
export function evaluationsForSubtopic(
  themeId: string,
  subtopicId: string,
  exams: CourseExam[],
  assignments: CourseAssignment[],
) {
  return {
    exams: exams.filter((e) => e.theme_id === themeId && e.subtopic_id === subtopicId),
    assignments: assignments.filter(
      (a) => a.theme_id === themeId && a.subtopic_id === subtopicId,
    ),
  };
}

export function themeWeightTotal(
  themeId: string,
  exams: CourseExam[],
  assignments: CourseAssignment[],
): number {
  const themeExams = exams.filter((e) => e.theme_id === themeId);
  const themeAssignments = assignments.filter((a) => a.theme_id === themeId);
  const sum =
    themeExams.reduce((n, e) => n + Number(e.weight_pct), 0) +
    themeAssignments.reduce((n, a) => n + Number(a.weight_pct), 0);
  return Math.round(sum * 100) / 100;
}

export function unlinkedEvaluations(exams: CourseExam[], assignments: CourseAssignment[]) {
  return {
    exams: exams.filter((e) => !e.theme_id),
    assignments: assignments.filter((a) => !a.theme_id),
  };
}
