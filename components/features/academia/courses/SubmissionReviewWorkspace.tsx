'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  assignmentFileServePath,
  isExternalFileUrl,
} from '@/lib/academia/submission-urls';
import type {
  CourseExamAnswer,
  CourseExamQuestion,
  CourseExamSubmission,
  ExamOption,
} from '@/lib/academia/types';
import type { ReviewEvaluationItem } from '@/lib/academia/submission-review';
import { CheckCircle2, FileText, XCircle } from 'lucide-react';

type ExamReviewData = {
  submission: CourseExamSubmission & { exam?: { title: string; rubric: string | null } };
  answers: CourseExamAnswer[];
  questions: CourseExamQuestion[];
};

function statusLabel(status: string, type: 'exam' | 'assignment'): string {
  if (type === 'exam') {
    if (status === 'released') return 'Liberada';
    if (status === 'graded') return 'Calificada (sin liberar)';
    return 'Pendiente';
  }
  return status === 'graded' ? 'Calificada' : 'Pendiente';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function SubmissionReviewWorkspace({
  courseId,
  initialSubmissionId,
}: {
  courseId: string;
  initialSubmissionId?: string | null;
}) {
  const [evaluations, setEvaluations] = useState<ReviewEvaluationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvalKey, setSelectedEvalKey] = useState<string>('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [examData, setExamData] = useState<ExamReviewData | null>(null);
  const [assignmentDetail, setAssignmentDetail] = useState<{
    submission: {
      id: string;
      file_urls: string[];
      submitted_at: string;
      is_late: boolean;
      raw_score: number | null;
      final_score: number | null;
      instructor_feedback: string | null;
      status: string;
    };
    assignment: {
      title: string;
      instructions: string | null;
      rubric: string | null;
      due_date: string;
    };
    student: { full_name: string } | null;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignmentScore, setAssignmentScore] = useState('');
  const [assignmentFeedback, setAssignmentFeedback] = useState('');
  const [essayGrades, setEssayGrades] = useState<
    Record<string, { points: string; feedback: string }>
  >({});

  const loadEvaluations = useCallback(() => {
    setLoading(true);
    fetch(`/api/academia/courses/${courseId}/submission-review`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setEvaluations(data.evaluations ?? []);
      })
      .catch((err) => setError((err as Error).message || 'No se pudieron cargar entregas'))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const selectedEval = useMemo(() => {
    if (!selectedEvalKey) return null;
    const [type, id] = selectedEvalKey.split(':');
    return evaluations.find((e) => e.type === type && e.id === id) ?? null;
  }, [evaluations, selectedEvalKey]);

  useEffect(() => {
    if (evaluations.length === 0) return;
    if (selectedEvalKey) return;

    if (initialSubmissionId) {
      for (const ev of evaluations) {
        const match = ev.submissions.find((s) => s.id === initialSubmissionId);
        if (match) {
          setSelectedEvalKey(`${ev.type}:${ev.id}`);
          setSelectedSubmissionId(match.id);
          return;
        }
      }
    }

    const firstWithSubs = evaluations.find((e) => e.submissions.length > 0) ?? evaluations[0];
    if (firstWithSubs) {
      setSelectedEvalKey(`${firstWithSubs.type}:${firstWithSubs.id}`);
      setSelectedSubmissionId(firstWithSubs.submissions[0]?.id ?? null);
    }
  }, [evaluations, selectedEvalKey, initialSubmissionId]);

  const loadSubmissionDetail = useCallback(async (submissionId: string, type: 'exam' | 'assignment') => {
    setLoadingDetail(true);
    setError(null);
    setExamData(null);
    setAssignmentDetail(null);

    try {
      if (type === 'exam') {
        const res = await fetch(`/api/academia/exams/submissions/${submissionId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el examen');
        setExamData(data);
        const grades: Record<string, { points: string; feedback: string }> = {};
        for (const q of data.questions as CourseExamQuestion[]) {
          if (q.question_type !== 'essay') continue;
          const ans = (data.answers as CourseExamAnswer[]).find((a) => a.question_id === q.id);
          grades[q.id] = {
            points: ans?.points_awarded != null ? String(ans.points_awarded) : String(q.points),
            feedback: ans?.instructor_feedback ?? '',
          };
        }
        setEssayGrades(grades);
      } else {
        const res = await fetch(`/api/academia/assignments/submissions/${submissionId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la tarea');
        setAssignmentDetail(data);
        setAssignmentScore(
          data.submission.raw_score != null ? String(data.submission.raw_score) : '',
        );
        setAssignmentFeedback(data.submission.instructor_feedback ?? '');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedSubmissionId || !selectedEval) return;
    void loadSubmissionDetail(selectedSubmissionId, selectedEval.type);
  }, [selectedSubmissionId, selectedEval, loadSubmissionDetail]);

  async function saveAssignmentGrade() {
    if (!selectedSubmissionId) return;
    const rawScore = Number(assignmentScore);
    if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 100) {
      setError('La calificación debe estar entre 0 y 100');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/academia/assignments/submissions/${selectedSubmissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawScore, feedback: assignmentFeedback.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      await loadSubmissionDetail(selectedSubmissionId, 'assignment');
      loadEvaluations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveExamGrade(release: boolean) {
    if (!selectedSubmissionId || !examData) return;

    const essayPayload = examData.questions
      .filter((q) => q.question_type === 'essay')
      .map((q) => ({
        questionId: q.id,
        pointsAwarded: Number(essayGrades[q.id]?.points ?? 0),
        feedback: essayGrades[q.id]?.feedback?.trim() || undefined,
      }));

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/academia/exams/submissions/${selectedSubmissionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: release ? 'release' : 'grade',
          release,
          essayGrades: essayPayload.length ? essayPayload : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      await loadSubmissionDetail(selectedSubmissionId, 'exam');
      loadEvaluations();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function optionLabel(options: ExamOption[] | null, optionId: string | null): string {
    if (!optionId) return '—';
    return options?.find((o) => o.id === optionId)?.text ?? optionId;
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-10 text-center text-sm text-muted-foreground">
        Cargando entregas…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(11rem,13rem)_1fr]">
        <aside className="flex h-auto min-h-[480px] flex-col rounded-xl border border-[var(--color-arena)] bg-card p-2 shadow-sm lg:h-[calc(100vh-12rem)]">
          <select
            className="w-full shrink-0 rounded-md border bg-background px-2 py-1.5 text-xs"
            value={selectedEvalKey}
            onChange={(e) => {
              setSelectedEvalKey(e.target.value);
              const [type, id] = e.target.value.split(':');
              const ev = evaluations.find((item) => item.type === type && item.id === id);
              setSelectedSubmissionId(ev?.submissions[0]?.id ?? null);
            }}
            title="Evaluación"
          >
            {evaluations.length === 0 ? (
              <option value="">Sin evaluaciones</option>
            ) : (
              evaluations.map((ev) => (
                <option key={`${ev.type}:${ev.id}`} value={`${ev.type}:${ev.id}`}>
                  {ev.type === 'exam' ? 'Ex.' : 'T.'} {ev.title} ({ev.submissions.length})
                </option>
              ))
            )}
          </select>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto border-t border-[var(--color-arena)] pt-2">
            {!selectedEval || selectedEval.submissions.length === 0 ? (
              <p className="px-1 text-xs text-muted-foreground">Sin entregas.</p>
            ) : (
              <ul className="space-y-0.5 text-xs">
                {selectedEval.submissions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedSubmissionId(s.id)}
                      className={`w-full rounded-md px-2 py-1.5 text-left transition-colors ${
                        selectedSubmissionId === s.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted/60'
                      }`}
                    >
                      <p className="truncate font-medium">{s.student_name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {statusLabel(s.status, selectedEval.type)}
                        {s.final_score != null ? ` · ${s.final_score}` : ''}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="h-auto min-h-[480px] overflow-y-auto rounded-xl border border-[var(--color-arena)] bg-card p-4 shadow-sm lg:h-[calc(100vh-12rem)]">
          {!selectedSubmissionId || !selectedEval ? (
            <div className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
              Selecciona una entrega para revisarla.
            </div>
          ) : loadingDetail ? (
            <div className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
              Cargando entrega…
            </div>
          ) : selectedEval.type === 'assignment' && assignmentDetail ? (
            <AssignmentReviewPanel
              detail={assignmentDetail}
              submissionId={selectedSubmissionId}
              score={assignmentScore}
              feedback={assignmentFeedback}
              saving={saving}
              onScoreChange={setAssignmentScore}
              onFeedbackChange={setAssignmentFeedback}
              onSave={saveAssignmentGrade}
            />
          ) : selectedEval.type === 'exam' && examData ? (
            <ExamReviewPanel
              data={examData}
              essayGrades={essayGrades}
              saving={saving}
              onEssayGradeChange={(questionId, field, value) =>
                setEssayGrades((prev) => ({
                  ...prev,
                  [questionId]: { ...prev[questionId], [field]: value },
                }))
              }
              onSave={() => saveExamGrade(false)}
              onRelease={() => saveExamGrade(true)}
              optionLabel={optionLabel}
            />
          ) : (
            <div className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
              No se pudo cargar la entrega.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function AssignmentReviewPanel({
  detail,
  submissionId,
  score,
  feedback,
  saving,
  onScoreChange,
  onFeedbackChange,
  onSave,
}: {
  detail: {
    submission: {
      file_urls: string[];
      submitted_at: string;
      is_late: boolean;
      raw_score: number | null;
      final_score: number | null;
      status: string;
    };
    assignment: {
      title: string;
      instructions: string | null;
      rubric: string | null;
    };
    student: { full_name: string } | null;
  };
  submissionId: string;
  score: string;
  feedback: string;
  saving: boolean;
  onScoreChange: (v: string) => void;
  onFeedbackChange: (v: string) => void;
  onSave: () => void;
}) {
  const fileUrl = detail.submission.file_urls[0];
  const viewerSrc = fileUrl
    ? isExternalFileUrl(fileUrl)
      ? fileUrl
      : assignmentFileServePath(submissionId, 0)
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{detail.assignment.title}</h2>
        <p className="text-sm text-muted-foreground">
          {detail.student?.full_name ?? 'Alumno'} · Entregado {formatDate(detail.submission.submitted_at)}
          {detail.submission.is_late ? ' · Tarde' : ''}
        </p>
        {detail.assignment.instructions ? (
          <p className="mt-2 text-sm text-muted-foreground">{detail.assignment.instructions}</p>
        ) : null}
      </div>

      {viewerSrc ? (
        <div className="overflow-hidden rounded-lg border bg-muted/20">
          <iframe
            title="PDF entregado"
            src={viewerSrc}
            className="h-[min(72vh,720px)] w-full bg-white"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          <FileText className="h-5 w-5" />
          Sin archivo adjunto en esta entrega.
        </div>
      )}

      {detail.assignment.rubric ? (
        <div className="rounded-md bg-muted/30 p-3 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rúbrica
          </p>
          <p className="whitespace-pre-wrap">{detail.assignment.rubric}</p>
        </div>
      ) : null}

      <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="assignment-score">Calificación (0–100)</Label>
          <Input
            id="assignment-score"
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => onScoreChange(e.target.value)}
          />
          {detail.submission.final_score != null && detail.submission.status === 'graded' ? (
            <p className="text-xs text-muted-foreground">
              Nota final con penalización: {detail.submission.final_score}
            </p>
          ) : null}
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="assignment-feedback">Retroalimentación para el alumno</Label>
          <Textarea
            id="assignment-feedback"
            rows={3}
            value={feedback}
            onChange={(e) => onFeedbackChange(e.target.value)}
            placeholder="Comentarios sobre la entrega…"
          />
        </div>
      </div>

      <Button onClick={onSave} disabled={saving}>
        {saving ? 'Guardando…' : 'Guardar calificación'}
      </Button>
    </div>
  );
}

function ExamReviewPanel({
  data,
  essayGrades,
  saving,
  onEssayGradeChange,
  onSave,
  onRelease,
  optionLabel,
}: {
  data: ExamReviewData;
  essayGrades: Record<string, { points: string; feedback: string }>;
  saving: boolean;
  onEssayGradeChange: (questionId: string, field: 'points' | 'feedback', value: string) => void;
  onSave: () => void;
  onRelease: () => void;
  optionLabel: (options: ExamOption[] | null, optionId: string | null) => string;
}) {
  const hasEssay = data.questions.some((q) => q.question_type === 'essay');
  const submission = data.submission;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{submission.exam?.title ?? 'Examen'}</h2>
        <p className="text-sm text-muted-foreground">
          Entregado {formatDate(submission.submitted_at)} · {statusLabel(submission.status, 'exam')}
        </p>
        {submission.auto_score != null ? (
          <p className="mt-1 text-sm">
            Calificación automática (opción múltiple): <strong>{submission.auto_score}</strong>
          </p>
        ) : null}
        {submission.final_score != null ? (
          <p className="text-sm text-primary">
            Nota final: <strong>{submission.final_score}</strong>
          </p>
        ) : null}
      </div>

      <ul className="space-y-3">
        {data.questions.map((q, index) => {
          const answer = data.answers.find((a) => a.question_id === q.id);
          const isMc = q.question_type === 'multiple_choice';

          return (
            <li key={q.id} className="rounded-lg border p-3">
              <p className="mb-2 text-sm font-medium">
                {index + 1}. {q.question_text}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({isMc ? 'opción múltiple' : 'abierta'} · {q.points} pts)
                </span>
              </p>

              {isMc ? (
                <div className="space-y-1 text-sm">
                  <p>
                    Respuesta del alumno:{' '}
                    <strong>{optionLabel(q.options, answer?.answer_text ?? null)}</strong>
                  </p>
                  <p className="flex items-center gap-1 text-xs">
                    {answer?.is_correct ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        Correcta · {answer.points_awarded ?? 0} pts
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        Incorrecta · 0 pts
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Correcta:{' '}
                    {optionLabel(
                      q.options,
                      q.options?.find((o) => o.is_correct)?.id ?? null,
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-md bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {answer?.answer_text?.trim() || 'Sin respuesta'}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Puntos (máx. {q.points})</Label>
                      <Input
                        type="number"
                        min={0}
                        max={q.points}
                        value={essayGrades[q.id]?.points ?? ''}
                        onChange={(e) => onEssayGradeChange(q.id, 'points', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Retroalimentación</Label>
                      <Textarea
                        rows={2}
                        value={essayGrades[q.id]?.feedback ?? ''}
                        onChange={(e) => onEssayGradeChange(q.id, 'feedback', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap gap-2 border-t pt-4">
        {hasEssay ? (
          <Button variant="outline" onClick={onSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar calificación de abiertas'}
          </Button>
        ) : null}
        <Button onClick={onRelease} disabled={saving}>
          {saving
            ? 'Guardando…'
            : submission.status === 'released'
              ? 'Actualizar y liberar'
              : 'Liberar calificación al alumno'}
        </Button>
      </div>
    </div>
  );
}
