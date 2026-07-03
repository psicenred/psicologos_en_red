'use client';

import { useEffect, useState } from 'react';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { CurriculumPanelView } from '@/components/features/academia/courses/CurriculumPanelView';
import type { CourseAssignment, CourseExam, CourseGradingMode } from '@/lib/academia/types';

type PanelMode = 'student' | 'instructor' | 'admin';

export function CourseTemarioPanel({
  courseId,
  mode,
  title = 'Temario',
  description,
}: {
  courseId: string;
  mode: PanelMode;
  title?: string;
  description?: string;
}) {
  const [curriculum, setCurriculum] = useState<string | null>(null);
  const [gradingMode, setGradingMode] = useState<CourseGradingMode>('weighted');
  const [exams, setExams] = useState<CourseExam[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/academia/courses/${courseId}`).then((r) => r.json()),
      fetch(`/api/academia/exams?courseId=${courseId}`).then((r) => r.json()),
      fetch(`/api/academia/assignments?courseId=${courseId}`).then((r) => r.json()),
    ])
      .then(([courseData, examsData, assignmentsData]) => {
        if (courseData.error) throw new Error(courseData.error);
        setCurriculum(courseData.course?.curriculum ?? null);
        setGradingMode(courseData.course?.grading_mode ?? 'weighted');
        setExams(examsData.exams ?? []);
        setAssignments(assignmentsData.assignments ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  const defaultDescription =
    mode === 'student'
      ? 'Plan de estudios con fechas, evaluaciones y rúbricas por tema.'
      : mode === 'instructor'
        ? 'Temario del curso con calendario y evaluaciones vinculadas a cada tema.'
        : 'Temario completo con fechas y evaluaciones (vista administrador).';

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-muted-foreground">
        Cargando temario…
      </div>
    );
  }

  if (error) {
    return <p className="text-destructive">{error}</p>;
  }

  return (
    <div>
      <AlumnoPageHeader title={title} description={description ?? defaultDescription} />
      <CurriculumPanelView
        raw={curriculum}
        exams={exams}
        assignments={assignments}
        mode={mode}
        courseId={courseId}
        gradingMode={gradingMode}
      />
    </div>
  );
}
