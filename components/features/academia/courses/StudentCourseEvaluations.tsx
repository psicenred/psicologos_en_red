'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  CourseAssignment,
  CourseExam,
  CourseExamQuestion,
  CourseExamSubmission,
  CourseAssignmentSubmission,
  CourseFinalGrade,
  CourseExamAnswer,
} from '@/lib/academia/types';
import {
  assignmentFileServePath,
  isExternalFileUrl,
} from '@/lib/academia/submission-urls';

type EvaluationSection = 'all' | 'exams' | 'assignments' | 'grades';

export function StudentCourseEvaluations({
  courseId,
  section = 'all',
}: {
  courseId: string;
  section?: EvaluationSection;
}) {
  const [exams, setExams] = useState<CourseExam[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [grade, setGrade] = useState<CourseFinalGrade | null>(null);
  const [gradingMode, setGradingMode] = useState<'weighted' | 'pass_fail'>('weighted');
  const [activeExam, setActiveExam] = useState<{
    exam: CourseExam;
    questions: CourseExamQuestion[];
    submission: CourseExamSubmission | null;
  } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([
      fetch(`/api/academia/exams?courseId=${courseId}`).then((r) => r.json()),
      fetch(`/api/academia/assignments?courseId=${courseId}`).then((r) => r.json()),
      fetch(`/api/academia/grades/course/${courseId}`).then((r) => r.json()),
    ])
      .then(([examsData, assignmentsData, gradesData]) => {
        setExams(examsData.exams ?? []);
        setAssignments(assignmentsData.assignments ?? []);
        setGrade(gradesData.grade ?? null);
        setGradingMode(gradesData.grading_mode ?? 'weighted');
      })
      .catch(() => setError('No se pudieron cargar evaluaciones'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [courseId]);

  async function openExam(exam: CourseExam) {
    const [examRes, subRes] = await Promise.all([
      fetch(`/api/academia/exams/${exam.id}`).then((r) => r.json()),
      fetch(`/api/academia/exams/${exam.id}/submit`).then((r) => r.json()),
    ]);
    setActiveExam({
      exam,
      questions: examRes.exam?.questions ?? [],
      submission: subRes.submission ?? null,
    });
    setAnswers({});
  }

  async function submitExam() {
    if (!activeExam) return;
    setError(null);
    const res = await fetch(`/api/academia/exams/${activeExam.exam.id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: Object.entries(answers).map(([questionId, answerText]) => ({
          questionId,
          answerText,
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Error al enviar');
      return;
    }
    setActiveExam(null);
    load();
  }

  const showGrades = section === 'all' || section === 'grades';
  const showExams = section === 'all' || section === 'exams';
  const showAssignments = section === 'all' || section === 'assignments';

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-sm text-muted-foreground">
        Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showGrades && gradingMode === 'pass_fail' ? (
        <section className="rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Resultado del curso
          </h2>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {grade?.pass_status === 'passed'
              ? 'Aprobado'
              : grade?.pass_status === 'failed'
                ? 'Reprobado'
                : 'Pendiente'}
          </p>
        </section>
      ) : null}

      {showGrades && gradingMode === 'weighted' && grade?.computed_grade != null ? (
        <section className="rounded-xl border border-[var(--color-arena)] bg-card p-6 shadow-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Calificación final
          </h2>
          <p className="mt-2 text-4xl font-bold text-primary">{grade.computed_grade}</p>
        </section>
      ) : null}

      {showGrades &&
      section === 'grades' &&
      gradingMode === 'weighted' &&
      grade?.computed_grade == null ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
          Aún no hay calificación final publicada para este curso.
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {showExams && activeExam ? (
        <StudentExamPanel
          activeExam={activeExam}
          answers={answers}
          onAnswersChange={setAnswers}
          onClose={() => setActiveExam(null)}
          onSubmit={submitExam}
        />
      ) : null}

      {showExams && !activeExam ? (
      <section className="space-y-3 rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
        {section === 'all' ? <h2 className="font-semibold">Exámenes</h2> : null}
        {exams.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin exámenes publicados.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {exams.map((e) => (
              <ExamListRow key={e.id} exam={e} onOpen={() => openExam(e)} />
            ))}
          </ul>
        )}
      </section>
      ) : null}

      {showAssignments ? (
      <section className="space-y-3 rounded-xl border border-[var(--color-arena)] bg-card p-5 shadow-sm">
        {section === 'all' ? <h2 className="font-semibold">Tareas</h2> : null}
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin tareas publicadas.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {assignments.map((a) => (
              <AssignmentRow key={a.id} assignment={a} onSubmitted={load} />
            ))}
          </ul>
        )}
      </section>
      ) : null}
    </div>
  );
}

function ExamListRow({ exam, onOpen }: { exam: CourseExam; onOpen: () => void }) {
  const [submission, setSubmission] = useState<CourseExamSubmission | null>(null);

  useEffect(() => {
    fetch(`/api/academia/exams/${exam.id}/submit`)
      .then((r) => r.json())
      .then((d) => setSubmission(d.submission ?? null))
      .catch(() => setSubmission(null));
  }, [exam.id]);

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2">
      <div>
        <span>{exam.title}</span>
        {submission ? (
          <p className="text-xs text-muted-foreground">
            Enviado
            {submission.status === 'released' && submission.final_score != null
              ? ` · Calificación: ${submission.final_score}`
              : ' · Calificación pendiente de liberación'}
          </p>
        ) : null}
      </div>
      <Button size="sm" variant="outline" onClick={onOpen}>
        {submission ? 'Ver' : 'Abrir'}
      </Button>
    </li>
  );
}

function StudentExamPanel({
  activeExam,
  answers,
  onAnswersChange,
  onClose,
  onSubmit,
}: {
  activeExam: {
    exam: CourseExam;
    questions: CourseExamQuestion[];
    submission: CourseExamSubmission | null;
  };
  answers: Record<string, string>;
  onAnswersChange: (v: Record<string, string>) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [review, setReview] = useState<{
    answers: CourseExamAnswer[];
    questions: CourseExamQuestion[];
    submission: CourseExamSubmission;
  } | null>(null);

  useEffect(() => {
    if (!activeExam.submission) {
      setReview(null);
      return;
    }
    fetch(`/api/academia/exams/submissions/${activeExam.submission.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.submission?.status === 'released') {
          setReview({
            submission: data.submission,
            answers: data.answers ?? [],
            questions: data.questions ?? activeExam.questions,
          });
        } else {
          setReview(null);
        }
      })
      .catch(() => setReview(null));
  }, [activeExam.submission, activeExam.questions]);

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{activeExam.exam.title}</h2>
        <Button variant="outline" size="sm" onClick={onClose}>
          Cerrar
        </Button>
      </div>

      {activeExam.submission && !review ? (
        <p className="text-sm text-muted-foreground">
          Ya enviaste este examen. Tu calificación será visible cuando el instructor la libere.
        </p>
      ) : null}

      {review ? (
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">
            Calificación: {review.submission.final_score ?? '—'}
          </p>
          {review.questions.map((q, i) => {
            const ans = review.answers.find((a) => a.question_id === q.id);
            return (
              <div key={q.id} className="rounded border p-3 text-sm">
                <p className="mb-2 font-medium">
                  {i + 1}. {q.question_text}
                </p>
                {q.question_type === 'multiple_choice' ? (
                  <p>
                    Tu respuesta:{' '}
                    {q.options?.find((o) => o.id === ans?.answer_text)?.text ?? '—'}
                    {ans?.is_correct != null ? (
                      <span className={ans.is_correct ? ' text-green-700' : ' text-destructive'}>
                        {' '}
                        · {ans.is_correct ? 'Correcta' : 'Incorrecta'}
                      </span>
                    ) : null}
                  </p>
                ) : (
                  <div className="space-y-1">
                    <p className="whitespace-pre-wrap rounded bg-muted/30 p-2">
                      {ans?.answer_text || 'Sin respuesta'}
                    </p>
                    {ans?.points_awarded != null ? (
                      <p className="text-xs text-muted-foreground">
                        Puntos: {ans.points_awarded}
                      </p>
                    ) : null}
                    {ans?.instructor_feedback ? (
                      <p className="text-xs text-muted-foreground">
                        Comentario: {ans.instructor_feedback}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {!activeExam.submission ? (
        <>
          {activeExam.questions.map((q) => (
            <div key={q.id} className="rounded border p-3">
              <p className="mb-2 text-sm font-medium">{q.question_text}</p>
              {q.question_type === 'multiple_choice' ? (
                <div className="space-y-1">
                  {(q.options ?? []).map((o) => (
                    <label key={o.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={q.id}
                        value={o.id}
                        onChange={() => onAnswersChange({ ...answers, [q.id]: o.id })}
                      />
                      {o.text}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="min-h-20 w-full rounded-md border px-2 py-1 text-sm"
                  onChange={(e) => onAnswersChange({ ...answers, [q.id]: e.target.value })}
                />
              )}
            </div>
          ))}
          <Button onClick={onSubmit}>Enviar examen</Button>
        </>
      ) : null}
    </section>
  );
}

function AssignmentRow({
  assignment,
  onSubmitted,
}: {
  assignment: CourseAssignment;
  onSubmitted: () => void;
}) {
  const [submission, setSubmission] = useState<CourseAssignmentSubmission | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reloadSubmission() {
    return fetch(`/api/academia/assignments/${assignment.id}`)
      .then((r) => r.json())
      .then((d) => setSubmission(d.submission ?? null))
      .catch(() => setSubmission(null));
  }

  useEffect(() => {
    void reloadSubmission();
  }, [assignment.id]);

  async function handleFileUpload(file: File) {
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Solo se permiten archivos PDF');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('El PDF no puede superar 15 MB');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('assignmentId', assignment.id);
      const res = await fetch('/api/academia/assignments/upload', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo subir la tarea');
      setSubmission(data.submission);
      onSubmitted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const viewerSrc =
    submission?.file_urls?.[0] && !isExternalFileUrl(submission.file_urls[0])
      ? assignmentFileServePath(submission.id, 0)
      : submission?.file_urls?.[0] ?? null;

  return (
    <li className="rounded border px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{assignment.title}</p>
          <p className="text-xs text-muted-foreground">
            Vence: {new Date(assignment.due_date).toLocaleString('es-MX')}
          </p>
          {assignment.instructions ? (
            <p className="mt-1 text-xs text-muted-foreground">{assignment.instructions}</p>
          ) : null}
          {submission?.status === 'graded' && submission.final_score != null ? (
            <p className="mt-2 text-sm font-medium text-green-700">
              Calificación: {submission.final_score}
            </p>
          ) : null}
          {submission?.instructor_feedback ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Retroalimentación: {submission.instructor_feedback}
            </p>
          ) : null}
          {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {submission ? (
            <Button size="sm" variant="outline" onClick={() => setViewOpen(true)}>
              Ver entrega
            </Button>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                  e.target.value = '';
                }}
              />
              <Button
                size="sm"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? 'Subiendo…' : 'Subir PDF'}
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{assignment.title}</DialogTitle>
          </DialogHeader>
          {viewerSrc ? (
            <iframe title="Mi entrega" src={viewerSrc} className="h-[70vh] w-full rounded border bg-white" />
          ) : (
            <p className="text-sm text-muted-foreground">No hay archivo para mostrar.</p>
          )}
        </DialogContent>
      </Dialog>
    </li>
  );
}
