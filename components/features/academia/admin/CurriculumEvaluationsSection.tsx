'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  evaluationsForSubtopic,
  evaluationsForTheme,
  formatEvalDueDate,
} from '@/lib/academia/theme-evaluations';
import type { CourseAssignment, CourseExam, CourseExamQuestion, CourseGradingMode } from '@/lib/academia/types';
import { ExamQuestionEditorDialog } from '@/components/features/academia/ExamQuestionEditorDialog';
import { Pencil, Plus, Trash2 } from 'lucide-react';

type EvalKind = 'exam' | 'assignment';

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return toDatetimeLocalValue(d.toISOString());
}

interface CurriculumEvaluationsSectionProps {
  courseId: string;
  themeId: string;
  subtopicId?: string;
  scopeLabel: string;
  gradingMode: CourseGradingMode;
  exams: CourseExam[];
  assignments: CourseAssignment[];
  onChanged: () => void;
}

export function CurriculumEvaluationsSection({
  courseId,
  themeId,
  subtopicId,
  scopeLabel,
  gradingMode,
  exams,
  assignments,
  onChanged,
}: CurriculumEvaluationsSectionProps) {
  const weighted = gradingMode === 'weighted';
  const scoped = subtopicId
    ? evaluationsForSubtopic(themeId, subtopicId, exams, assignments)
    : evaluationsForTheme(themeId, exams, assignments);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<EvalKind>('assignment');
  const [title, setTitle] = useState('');
  const [weightPct, setWeightPct] = useState('10');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [rubric, setRubric] = useState('');
  const [instructions, setInstructions] = useState('');
  const [examQuestions, setExamQuestions] = useState<CourseExamQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [questionDialogType, setQuestionDialogType] = useState<'multiple_choice' | 'essay'>(
    'multiple_choice',
  );
  const [editingQuestion, setEditingQuestion] = useState<CourseExamQuestion | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const isEditing = editingId != null;

  async function reloadExamQuestions() {
    if (!editingId) return;
    const qRes = await fetch(`/api/academia/exams/${editingId}`);
    const qData = await qRes.json();
    setExamQuestions(qData.exam?.questions ?? []);
  }

  function resetForm() {
    setKind('assignment');
    setTitle('');
    setWeightPct('10');
    setDueDate(defaultDueDate());
    setRubric('');
    setInstructions('');
    setEditingId(null);
    setExamQuestions([]);
    setShowForm(false);
    setError(null);
  }

  function openCreate() {
    resetForm();
    setShowForm(true);
  }

  function openEdit(type: EvalKind, item: CourseExam | CourseAssignment) {
    setKind(type);
    setEditingId(item.id);
    setTitle(item.title);
    setWeightPct(String(item.weight_pct ?? 0));
    setRubric(item.rubric ?? '');
    setDueDate(toDatetimeLocalValue((item as CourseExam).due_date ?? (item as CourseAssignment).due_date));
    if (type === 'assignment') {
      setInstructions((item as CourseAssignment).instructions ?? '');
    } else {
      setInstructions('');
    }
    setShowForm(true);
    setError(null);
  }

  useEffect(() => {
    if (!editingId || kind !== 'exam') {
      setExamQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    fetch(`/api/academia/exams/${editingId}`)
      .then((r) => r.json())
      .then((data) => setExamQuestions(data.exam?.questions ?? []))
      .catch(() => setExamQuestions([]))
      .finally(() => setLoadingQuestions(false));
  }, [editingId, kind]);

  async function updateWeight(type: EvalKind, item: CourseExam | CourseAssignment, weight: number) {
    const action = type === 'exam' ? 'upsert_exam' : 'upsert_assignment';
    const body =
      type === 'exam'
        ? {
            action,
            courseId,
            exam: {
              id: item.id,
              title: item.title,
              weight_pct: weight,
              theme_id: item.theme_id,
              subtopic_id: item.subtopic_id,
              rubric: item.rubric,
              due_date: (item as CourseExam).due_date,
            },
          }
        : {
            action,
            courseId,
            assignment: {
              id: item.id,
              title: item.title,
              weight_pct: weight,
              theme_id: item.theme_id,
              subtopic_id: item.subtopic_id,
              rubric: item.rubric,
              due_date: (item as CourseAssignment).due_date,
              instructions: (item as CourseAssignment).instructions,
            },
          };

    await fetch('/api/academia/admin/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    onChanged();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título es obligatorio');
      return;
    }
    if (!dueDate) {
      setError('La fecha límite es obligatoria');
      return;
    }

    setSaving(true);
    setError(null);

    const dueIso = new Date(dueDate).toISOString();
    const action = kind === 'exam' ? 'upsert_exam' : 'upsert_assignment';
    const weight = weighted ? Number(weightPct) || 0 : 0;

    const body =
      kind === 'exam'
        ? {
            action,
            courseId,
            exam: {
              id: editingId ?? undefined,
              title: title.trim(),
              weight_pct: weight,
              theme_id: themeId,
              subtopic_id: subtopicId ?? null,
              rubric: rubric.trim() || null,
              due_date: dueIso,
            },
          }
        : {
            action,
            courseId,
            assignment: {
              id: editingId ?? undefined,
              title: title.trim(),
              instructions: instructions.trim() || null,
              due_date: dueIso,
              weight_pct: weight,
              theme_id: themeId,
              subtopic_id: subtopicId ?? null,
              rubric: rubric.trim() || null,
            },
          };

    try {
      const res = await fetch('/api/academia/admin/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');

      if (!isEditing) resetForm();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function openQuestionDialog(type: 'multiple_choice' | 'essay', question?: CourseExamQuestion) {
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
    if (!editingId) throw new Error('Guarda el examen antes de agregar preguntas');

    setSavingQuestion(true);
    try {
      const res = await fetch('/api/academia/admin/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_exam_question',
          courseId,
          examId: editingId,
          question: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar la pregunta');
      await reloadExamQuestions();
    } finally {
      setSavingQuestion(false);
    }
  }

  async function deleteExamQuestion(questionId: string) {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;
    const res = await fetch('/api/academia/admin/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'delete_exam_question',
        courseId,
        questionId,
      }),
    });
    if (res.ok) {
      setExamQuestions((prev) => prev.filter((q) => q.id !== questionId));
    }
  }

  async function handleDelete(type: EvalKind, id: string) {
    if (!window.confirm('¿Eliminar esta evaluación?')) return;

    const action = type === 'exam' ? 'delete_exam' : 'delete_assignment';
    const body =
      type === 'exam'
        ? { action, courseId, examId: id }
        : { action, courseId, assignmentId: id };

    const res = await fetch('/api/academia/admin/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) onChanged();
  }

  const hasItems = scoped.exams.length > 0 || scoped.assignments.length > 0;

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs uppercase tracking-wide text-primary">
          Evaluaciones — {scopeLabel}
        </Label>
        {!showForm ? (
          <Button type="button" variant="outline" size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Agregar
          </Button>
        ) : null}
      </div>

      {!weighted ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Modo aprobado/reprobado: las evaluaciones se registran sin ponderación. El instructor
          marcará el resultado final.
        </p>
      ) : null}

      {hasItems ? (
        <ul className="mb-3 space-y-2 text-sm">
          {scoped.assignments.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-[var(--color-arena)] bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Tarea: {a.title}</p>
                <p className="text-xs text-muted-foreground">
                  Entrega: {formatEvalDueDate(a.due_date) ?? '—'}
                </p>
                {weighted ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Label className="shrink-0 text-xs text-muted-foreground">Peso</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-8 w-20 text-xs"
                      defaultValue={Number(a.weight_pct)}
                      onBlur={(e) =>
                        updateWeight('assignment', a, Number(e.target.value) || 0)
                      }
                    />
                    <span className="text-xs text-muted-foreground">% de 100</span>
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit('assignment', a)}
                  title="Editar tarea"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete('assignment', a.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
          {scoped.exams.map((ex) => (
            <li
              key={ex.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-[var(--color-arena)] bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Examen: {ex.title}</p>
                <p className="text-xs text-muted-foreground">
                  {ex.due_date ? `Fecha: ${formatEvalDueDate(ex.due_date)}` : 'Sin fecha'}
                </p>
                {weighted ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Label className="shrink-0 text-xs text-muted-foreground">Peso</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      className="h-8 w-20 text-xs"
                      defaultValue={Number(ex.weight_pct)}
                      onBlur={(e) => updateWeight('exam', ex, Number(e.target.value) || 0)}
                    />
                    <span className="text-xs text-muted-foreground">% de 100</span>
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEdit('exam', ex)}
                  title="Editar examen"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete('exam', ex.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">Sin evaluaciones en este nivel.</p>
      )}

      {showForm ? (
        <form onSubmit={handleSave} className="space-y-3 border-t border-primary/20 pt-3">
          <p className="text-sm font-medium text-foreground">
            {isEditing ? `Editar ${kind === 'exam' ? 'examen' : 'tarea'}` : 'Nueva evaluación'}
          </p>
          {!isEditing ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={kind === 'assignment' ? 'default' : 'outline'}
              onClick={() => setKind('assignment')}
            >
              Tarea
            </Button>
            <Button
              type="button"
              size="sm"
              variant={kind === 'exam' ? 'default' : 'outline'}
              onClick={() => setKind('exam')}
            >
              Examen
            </Button>
          </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Título</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={kind === 'exam' ? 'Examen parcial' : 'Ensayo reflexivo'}
              />
            </div>
            {weighted ? (
              <div className="space-y-1">
                <Label className="text-xs">Peso (% de la calificación final, de 100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={weightPct}
                  onChange={(e) => setWeightPct(e.target.value)}
                />
              </div>
            ) : null}
            <div className="space-y-1">
              <Label className="text-xs">Fecha límite</Label>
              <Input
                type="datetime-local"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {kind === 'assignment' ? (
            <div className="space-y-1">
              <Label className="text-xs">Instrucciones (opcional)</Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={2}
                placeholder="Indicaciones de entrega…"
              />
            </div>
          ) : null}

          {isEditing && kind === 'exam' ? (
            <div className="space-y-2 rounded-md border border-[var(--color-arena)] bg-muted/20 p-3">
              <Label className="text-xs font-semibold uppercase tracking-wide">Preguntas del examen</Label>
              {loadingQuestions ? (
                <p className="text-xs text-muted-foreground">Cargando preguntas…</p>
              ) : examQuestions.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin preguntas aún.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {examQuestions.map((q, i) => (
                    <li
                      key={q.id}
                      className="rounded border bg-card px-2 py-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p>
                            {i + 1}. {q.question_text}
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({q.question_type === 'essay' ? 'abierta' : 'opción múltiple'} ·{' '}
                              {q.points} pt{q.points === 1 ? '' : 's'})
                            </span>
                          </p>
                          {q.question_type === 'multiple_choice' && (q.options ?? []).length > 0 ? (
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
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openQuestionDialog(q.question_type, q)}
                            title="Editar pregunta"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            onClick={() => deleteExamQuestion(q.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openQuestionDialog('multiple_choice')}
                >
                  + Opción múltiple
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openQuestionDialog('essay')}
                >
                  + Pregunta abierta
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <Label className="text-xs">Rúbrica (opcional)</Label>
            <Textarea
              value={rubric}
              onChange={(e) => setRubric(e.target.value)}
              rows={2}
              placeholder="Criterios de evaluación…"
            />
          </div>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar evaluación'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      <ExamQuestionEditorDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        questionType={questionDialogType}
        initialQuestion={editingQuestion}
        orderIndex={examQuestions.length}
        saving={savingQuestion}
        onSave={saveExamQuestion}
      />
    </div>
  );
}
