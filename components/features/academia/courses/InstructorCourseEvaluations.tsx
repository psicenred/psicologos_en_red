'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { ExamQuestionEditorDialog } from '@/components/features/academia/ExamQuestionEditorDialog';
import { DateTimeInlineEditor } from '@/components/features/academia/DateTimeInlineEditor';
import { parseCurriculum } from '@/lib/academia/curriculum';
import { formatEvalDueDate } from '@/lib/academia/theme-evaluations';
import type {
  CourseAssignment,
  CourseExam,
  CourseExamQuestion,
  InstructorCourseMetrics,
} from '@/lib/academia/types';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';

type PendingItem = {
  id: string;
  type: 'exam' | 'assignment';
  title: string;
  student_id: string;
  submitted_at: string;
  exam_id?: string;
  assignment_id?: string;
};

type EvaluationSection = 'all' | 'evaluations' | 'metrics';

export function InstructorCourseEvaluations({
  courseId,
  section = 'all',
}: {
  courseId: string;
  section?: EvaluationSection;
}) {
  const [exams, setExams] = useState<CourseExam[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [metrics, setMetrics] = useState<InstructorCourseMetrics | null>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gradingMode, setGradingMode] = useState<'weighted' | 'pass_fail'>('weighted');
  const [students, setStudents] = useState<
    {
      student_id: string;
      full_name: string;
      pass_status: string;
      computed_grade: number | null;
    }[]
  >([]);
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [examQuestions, setExamQuestions] = useState<Record<string, CourseExamQuestion[]>>({});
  const [loadingExamQuestions, setLoadingExamQuestions] = useState<string | null>(null);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionDialogType, setQuestionDialogType] = useState<'multiple_choice' | 'essay'>(
    'multiple_choice',
  );
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<CourseExamQuestion | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  function load() {
    Promise.all([
      fetch(`/api/academia/exams?courseId=${courseId}`).then((r) => r.json()),
      fetch(`/api/academia/assignments?courseId=${courseId}`).then((r) => r.json()),
      fetch(`/api/academia/grades/course/${courseId}`).then((r) => r.json()),
    ])
      .then(([examsData, assignmentsData, gradesData]) => {
        setExams(examsData.exams ?? []);
        setAssignments(assignmentsData.assignments ?? []);
        setMetrics(gradesData.metrics ?? null);
        const p = [
          ...(gradesData.pending?.exams ?? []),
          ...(gradesData.pending?.assignments ?? []),
        ];
        setPending(p);
        setGradingMode(gradesData.grading_mode ?? 'weighted');
        setStudents(gradesData.students ?? []);
      })
      .catch(() => setError('No se pudieron cargar evaluaciones'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [courseId]);

  async function loadExamQuestions(examId: string) {
    setLoadingExamQuestions(examId);
    try {
      const res = await fetch(`/api/academia/exams/${examId}`);
      const data = await res.json();
      setExamQuestions((prev) => ({
        ...prev,
        [examId]: data.exam?.questions ?? [],
      }));
    } catch {
      setExamQuestions((prev) => ({ ...prev, [examId]: [] }));
    } finally {
      setLoadingExamQuestions(null);
    }
  }

  function toggleExamQuestions(examId: string) {
    if (expandedExamId === examId) {
      setExpandedExamId(null);
      return;
    }
    setExpandedExamId(examId);
    if (!examQuestions[examId]) {
      void loadExamQuestions(examId);
    }
  }

  function openQuestionDialog(
    examId: string,
    type: 'multiple_choice' | 'essay',
    question?: CourseExamQuestion,
  ) {
    setActiveExamId(examId);
    setQuestionDialogType(type);
    setEditingQuestion(question ?? null);
    setQuestionDialogOpen(true);
  }

  async function saveExamQuestion(payload: {
    id?: string;
    question_type: 'multiple_choice' | 'essay';
    question_text: string;
    options?: { id: string; text: string; is_correct?: boolean }[];
    points: number;
    order_index: number;
  }) {
    if (!activeExamId) throw new Error('Examen no seleccionado');

    setSavingQuestion(true);
    try {
      const res = await fetch('/api/academia/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_question',
          examId: activeExamId,
          question: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la pregunta');
      await loadExamQuestions(activeExamId);
    } finally {
      setSavingQuestion(false);
    }
  }

  async function deleteExamQuestion(examId: string, questionId: string) {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;
    const res = await fetch('/api/academia/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_question',
        examId,
        questionId,
      }),
    });
    if (res.ok) await loadExamQuestions(examId);
  }

  async function pickThemeId(): Promise<string | null> {
    const res = await fetch(`/api/academia/courses/${courseId}`);
    const data = await res.json();
    const themes = parseCurriculum(data.course?.curriculum).themes.filter((t) => t.title.trim());
    if (themes.length === 0) return null;

    const list = themes.map((t, i) => `${i + 1}. ${t.title}`).join('\n');
    const pick = window.prompt(
      `¿A qué tema pertenece? (número 1-${themes.length}, vacío = general)\n\n${list}`,
    );
    if (!pick?.trim()) return null;
    const idx = Number(pick) - 1;
    if (idx < 0 || idx >= themes.length) return null;
    return themes[idx].id;
  }

  async function createExam() {
    const title = window.prompt('Título del examen');
    if (!title) return;
    const weight = window.prompt('Peso en calificación final (%)', '30');
    const themeId = await pickThemeId();
    const rubric = window.prompt('Rúbrica (opcional)', '') || null;

    const res = await fetch('/api/academia/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_exam',
        courseId,
        title,
        weight_pct: Number(weight ?? 0),
        theme_id: themeId,
        rubric,
      }),
    });
    if (res.ok) load();
  }

  async function createAssignment() {
    const title = window.prompt('Título de la tarea');
    if (!title) return;
    const due = window.prompt('Fecha límite (YYYY-MM-DDTHH:mm)', '');
    if (!due) return;
    const weight = window.prompt('Peso en calificación final (%)', '20');
    const themeId = await pickThemeId();
    const rubric = window.prompt('Rúbrica (opcional)', '') || null;

    const res = await fetch('/api/academia/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_assignment',
        courseId,
        title,
        instructions: '',
        due_date: due,
        weight_pct: Number(weight ?? 0),
        theme_id: themeId,
        rubric,
      }),
    });
    if (res.ok) load();
  }

  async function setPassStatus(studentId: string, passStatus: 'passed' | 'failed' | 'pending') {
    const res = await fetch(`/api/academia/grades/course/${courseId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_pass_status', studentId, passStatus }),
    });
    if (res.ok) load();
  }

  async function saveExamDueDate(examId: string, dueDate: string) {
    const res = await fetch('/api/academia/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_due_date',
        examId,
        due_date: dueDate,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la fecha');
    setExams((prev) =>
      prev.map((exam) => (exam.id === examId ? { ...exam, due_date: data.exam.due_date } : exam)),
    );
  }

  async function saveAssignmentDueDate(assignmentId: string, dueDate: string) {
    const res = await fetch('/api/academia/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_due_date',
        assignmentId,
        due_date: dueDate,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la fecha');
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, due_date: data.assignment.due_date }
          : assignment,
      ),
    );
  }

  const showMetrics = section === 'all' || section === 'metrics';
  const showEvaluations = section === 'all' || section === 'evaluations';

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {showMetrics && metrics ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Pendientes de calificar" value={String(metrics.pendingGrading)} />
          <MetricCard
            label="Promedio del curso"
            value={metrics.averageGrade != null ? `${metrics.averageGrade}` : '—'}
          />
          <MetricCard
            label="Asistencia"
            value={metrics.attendanceRate != null ? `${metrics.attendanceRate}%` : 'N/A'}
          />
          <MetricCard label="Riesgo de abandono" value={String(metrics.dropoutRiskCount)} />
          <MetricCard
            label="Avance promedio"
            value={metrics.averageProgressPct != null ? `${metrics.averageProgressPct}%` : '—'}
          />
        </section>
      ) : null}

      {showMetrics && section === 'metrics' && !metrics ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
          Aún no hay métricas disponibles para este curso.
        </div>
      ) : null}

      {showEvaluations && gradingMode === 'pass_fail' && students.length > 0 ? (
        <section className="rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
          <h2 className="mb-3 font-semibold">Aprobado / reprobado</h2>
          <ul className="space-y-2 text-sm">
            {students.map((s) => (
              <li
                key={s.student_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-arena)] px-3 py-2"
              >
                <span>
                  {s.full_name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {s.pass_status === 'passed'
                      ? '· Aprobado'
                      : s.pass_status === 'failed'
                        ? '· Reprobado'
                        : '· Pendiente'}
                  </span>
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPassStatus(s.student_id, 'passed')}
                  >
                    Aprobar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setPassStatus(s.student_id, 'failed')}
                  >
                    Reprobar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showEvaluations && pending.length > 0 ? (
        <section className="rounded-xl border border-accent bg-accent/30 p-5">
          <h2 className="mb-3 font-semibold">Pendientes de calificar</h2>
          <ul className="space-y-2 text-sm">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-arena)] bg-card px-3 py-2"
              >
                <span>
                  {p.type === 'exam' ? 'Examen' : 'Tarea'}: {p.title}
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/cursos/instructor/${courseId}/entregas?submission=${p.id}`}>
                    Revisar y calificar
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {showEvaluations ? (
      <section className="space-y-3 rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Exámenes</h2>
          <Button size="sm" variant="outline" onClick={createExam}>
            + Examen
          </Button>
        </div>
        {exams.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin exámenes aún.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {exams.map((e) => {
              const questions = examQuestions[e.id] ?? [];
              const isExpanded = expandedExamId === e.id;
              return (
                <li key={e.id} className="rounded border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExamQuestions(e.id)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      <ChevronDown
                        className={`mt-0.5 h-4 w-4 shrink-0 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                      <span>
                        {e.title}
                        {gradingMode === 'weighted' ? ` · ${e.weight_pct}%` : ''}
                        {e.theme_id ? (
                          <Link
                            href={`/cursos/instructor/${courseId}/temario`}
                            className="ml-2 text-xs text-primary underline-offset-2 hover:underline"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            ver en temario
                          </Link>
                        ) : null}
                      </span>
                    </button>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openQuestionDialog(e.id, 'multiple_choice')}
                      >
                        + Opción múltiple
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openQuestionDialog(e.id, 'essay')}
                      >
                        + Abierta
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-[var(--color-arena)] pt-3">
                    <DateTimeInlineEditor
                      value={e.due_date}
                      label="Fecha límite de entrega"
                      emptyLabel="Sin fecha límite"
                      onSave={(iso) => saveExamDueDate(e.id, iso)}
                    />
                    {!e.due_date ? null : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Actual: {formatEvalDueDate(e.due_date)}
                      </p>
                    )}
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 border-t border-[var(--color-arena)] pt-3">
                      {loadingExamQuestions === e.id ? (
                        <p className="text-xs text-muted-foreground">Cargando preguntas…</p>
                      ) : questions.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sin preguntas aún.</p>
                      ) : (
                        <ul className="space-y-2">
                          {questions.map((q, i) => (
                            <li key={q.id} className="rounded-md border bg-muted/20 px-2 py-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p>
                                    {i + 1}. {q.question_text}
                                    <span className="ml-1 text-xs text-muted-foreground">
                                      ({q.question_type === 'essay' ? 'abierta' : 'opción múltiple'}{' '}
                                      · {q.points} pt{q.points === 1 ? '' : 's'})
                                    </span>
                                  </p>
                                  {q.question_type === 'multiple_choice' &&
                                  (q.options ?? []).length > 0 ? (
                                    <ul className="mt-1 space-y-0.5 pl-4 text-xs text-muted-foreground">
                                      {(q.options ?? []).map((o, oi) => (
                                        <li
                                          key={o.id}
                                          className={o.is_correct ? 'font-medium text-primary' : ''}
                                        >
                                          {String.fromCharCode(65 + oi)}. {o.text}
                                          {o.is_correct ? ' ✓' : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openQuestionDialog(e.id, q.question_type, q)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive"
                                    onClick={() => deleteExamQuestion(e.id, q.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
      ) : null}

      {showEvaluations ? (
      <section className="space-y-3 rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Tareas</h2>
          <Button size="sm" variant="outline" onClick={createAssignment}>
            + Tarea
          </Button>
        </div>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin tareas aún.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {assignments.map((a) => (
              <li key={a.id} className="space-y-3 rounded border px-3 py-2">
                <div>
                  <strong>{a.title}</strong>
                  {gradingMode === 'weighted' ? (
                    <span className="ml-2 text-muted-foreground">· {a.weight_pct}%</span>
                  ) : null}
                </div>
                <DateTimeInlineEditor
                  value={a.due_date}
                  label="Fecha límite de entrega"
                  onSave={(iso) => saveAssignmentDueDate(a.id, iso)}
                />
                <p className="text-xs text-muted-foreground">
                  Actual: {formatEvalDueDate(a.due_date) ?? '—'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      ) : null}

      <ExamQuestionEditorDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        questionType={questionDialogType}
        initialQuestion={editingQuestion}
        orderIndex={activeExamId ? (examQuestions[activeExamId]?.length ?? 0) : 0}
        saving={savingQuestion}
        onSave={saveExamQuestion}
      />
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-arena)] bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
