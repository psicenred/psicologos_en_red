'use client';

import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  emptyCurriculum,
  emptySubtopic,
  emptyTheme,
  parseCurriculum,
  serializeCurriculum,
} from '@/lib/academia/curriculum';
import { CurriculumThemeCollapsible } from '@/components/features/academia/courses/CurriculumThemeCollapsible';
import { CurriculumEvaluationsSection } from '@/components/features/academia/admin/CurriculumEvaluationsSection';
import type {
  CourseAssignment,
  CourseExam,
  CourseFormat,
  CourseGradingMode,
  CurriculumSubtopic,
  CurriculumTheme,
  StructuredCurriculum,
} from '@/lib/academia/types';
import { isWeightBalanced, totalEvaluationWeight } from '@/lib/academia/grading-utils';
import { Plus, Trash2 } from 'lucide-react';

export function CurriculumEditor({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [curriculum, setCurriculum] = useState<StructuredCurriculum>(emptyCurriculum());
  const [exams, setExams] = useState<CourseExam[]>([]);
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [gradingMode, setGradingMode] = useState<CourseGradingMode>('weighted');
  const [attendanceWeight, setAttendanceWeight] = useState(0);
  const [courseFormat, setCourseFormat] = useState<CourseFormat>('async');
  const [savingGrading, setSavingGrading] = useState(false);

  function loadEvaluations() {
    return fetch(`/api/academia/admin/evaluations?courseId=${courseId}`)
      .then((r) => r.json())
      .then((data) => {
        setExams(data.exams ?? []);
        setAssignments(data.assignments ?? []);
      });
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/academia/courses/${courseId}`).then((r) => r.json()),
      fetch(`/api/academia/admin/evaluations?courseId=${courseId}`).then((r) => r.json()),
    ])
      .then(([courseData, evalData]) => {
        if (courseData.error) throw new Error(courseData.error);
        const parsed = parseCurriculum(courseData.course?.curriculum);
        setCurriculum(parsed.themes.length > 0 ? parsed : { v: 1, themes: [emptyTheme()] });
        setExams(evalData.exams ?? []);
        setAssignments(evalData.assignments ?? []);
        setGradingMode(courseData.course?.grading_mode ?? 'weighted');
        setAttendanceWeight(Number(courseData.course?.attendance_weight_pct ?? 0));
        setCourseFormat(courseData.course?.format ?? 'async');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseId]);

  function updateTheme(themeId: string, patch: Partial<CurriculumTheme>) {
    setCurriculum((prev) => ({
      ...prev,
      themes: prev.themes.map((t) => (t.id === themeId ? { ...t, ...patch } : t)),
    }));
  }

  function updateSubtopic(themeId: string, subtopicId: string, patch: Partial<CurriculumSubtopic>) {
    setCurriculum((prev) => ({
      ...prev,
      themes: prev.themes.map((t) =>
        t.id === themeId
          ? {
              ...t,
              subtopics: t.subtopics.map((s) => (s.id === subtopicId ? { ...s, ...patch } : s)),
            }
          : t,
      ),
    }));
  }

  function addTheme() {
    setCurriculum((prev) => ({ ...prev, themes: [...prev.themes, emptyTheme()] }));
  }

  function removeTheme(themeId: string) {
    setCurriculum((prev) => ({
      ...prev,
      themes: prev.themes.filter((t) => t.id !== themeId),
    }));
  }

  function addSubtopic(themeId: string) {
    setCurriculum((prev) => ({
      ...prev,
      themes: prev.themes.map((t) =>
        t.id === themeId ? { ...t, subtopics: [...t.subtopics, emptySubtopic()] } : t,
      ),
    }));
  }

  function removeSubtopic(themeId: string, subtopicId: string) {
    setCurriculum((prev) => ({
      ...prev,
      themes: prev.themes.map((t) =>
        t.id === themeId
          ? { ...t, subtopics: t.subtopics.filter((s) => s.id !== subtopicId) }
          : t,
      ),
    }));
  }

  function addContentLine(themeId: string, subtopicId: string) {
    setCurriculum((prev) => ({
      ...prev,
      themes: prev.themes.map((t) =>
        t.id === themeId
          ? {
              ...t,
              subtopics: t.subtopics.map((s) =>
                s.id === subtopicId ? { ...s, content: [...s.content, ''] } : s,
              ),
            }
          : t,
      ),
    }));
  }

  function updateContentLine(
    themeId: string,
    subtopicId: string,
    lineIndex: number,
    value: string,
  ) {
    setCurriculum((prev) => ({
      ...prev,
      themes: prev.themes.map((t) =>
        t.id === themeId
          ? {
              ...t,
              subtopics: t.subtopics.map((s) =>
                s.id === subtopicId
                  ? {
                      ...s,
                      content: s.content.map((line, i) => (i === lineIndex ? value : line)),
                    }
                  : s,
              ),
            }
          : t,
      ),
    }));
  }

  function removeContentLine(themeId: string, subtopicId: string, lineIndex: number) {
    setCurriculum((prev) => ({
      ...prev,
      themes: prev.themes.map((t) =>
        t.id === themeId
          ? {
              ...t,
              subtopics: t.subtopics.map((s) =>
                s.id === subtopicId
                  ? { ...s, content: s.content.filter((_, i) => i !== lineIndex) }
                  : s,
              ),
            }
          : t,
      ),
    }));
  }

  async function saveGradingSettings(
    mode: CourseGradingMode,
    attendancePct?: number,
  ) {
    setSavingGrading(true);
    setError(null);
    try {
      const res = await fetch('/api/academia/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: courseId,
          grading_mode: mode,
          attendance_weight_pct:
            attendancePct ?? (mode === 'weighted' ? attendanceWeight : 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      setGradingMode(data.course?.grading_mode ?? mode);
      setAttendanceWeight(Number(data.course?.attendance_weight_pct ?? 0));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingGrading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch('/api/academia/admin/courses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: courseId,
          curriculum: serializeCurriculum(curriculum),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar el temario');

      setMessage('Temario guardado correctamente');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--color-arena)] bg-card p-8 text-center text-muted-foreground">
        Cargando temario…
      </div>
    );
  }

  return (
    <div>
      <AlumnoPageHeader
        title="Temario del curso"
        description="Organiza temas, subtemas, fechas, evaluaciones y referencias. En /academia solo se publica el temario básico."
      />

      {message ? (
        <div className="mb-6 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-[var(--color-arena)] bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={gradingMode === 'weighted'}
              disabled={savingGrading}
              onClick={() =>
                saveGradingSettings(gradingMode === 'weighted' ? 'pass_fail' : 'weighted')
              }
              className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                gradingMode === 'weighted' ? 'bg-primary' : 'bg-muted'
              } ${savingGrading ? 'opacity-60' : ''}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  gradingMode === 'weighted' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-foreground">
              Evaluar por tareas, exámenes y asistencia
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={addTheme}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar tema
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar temario'}
            </Button>
          </div>
        </div>

        {gradingMode === 'weighted' ? (
          <div className="space-y-3 border-t border-[var(--color-arena)] pt-3">
            {courseFormat === 'sync' ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Peso de asistencia (% de 100)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    className="h-9 w-28"
                    value={attendanceWeight}
                    onChange={(e) => setAttendanceWeight(Number(e.target.value) || 0)}
                    onBlur={() => saveGradingSettings('weighted', attendanceWeight)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Solo aplica en cursos síncronos con sesiones en vivo registradas.
                </p>
              </div>
            ) : null}
            {(() => {
              const total = totalEvaluationWeight(
                exams,
                assignments,
                courseFormat === 'sync' ? attendanceWeight : 0,
              );
              const ok = isWeightBalanced(total);
              return (
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    ok
                      ? 'bg-secondary/15 text-secondary-foreground'
                      : 'bg-accent/40 text-foreground'
                  }`}
                >
                  Ponderación total: <strong>{total}%</strong> de 100
                  {ok ? ' ✓' : ' — ajusta los pesos para que sumen 100%'}
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="border-t border-[var(--color-arena)] pt-3 text-sm text-muted-foreground">
            Modo <strong>aprobado / reprobado</strong>: el instructor decide el resultado final de
            cada alumno. Las evaluaciones sirven para entregables y seguimiento, sin calificación
            numérica ponderada.
          </p>
        )}
      </div>

      {curriculum.themes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-arena)] bg-card p-10 text-center text-muted-foreground">
          No hay temas. Agrega el primero para empezar.
        </div>
      ) : (
        <div className="space-y-3">
          {curriculum.themes.map((theme, themeIndex) => (
            <CurriculumThemeCollapsible
              key={theme.id}
              themeId={theme.id}
              variant="card"
              defaultOpen={themeIndex === 0}
              title={
                <>
                  Tema {themeIndex + 1}
                  {theme.title ? `: ${theme.title}` : ''}
                </>
              }
              actions={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    removeTheme(theme.id);
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            >
              <div className="space-y-2">
                <Label>Título del tema</Label>
                <Input
                  value={theme.title}
                  onChange={(e) => updateTheme(theme.id, { title: e.target.value })}
                  placeholder="Ej. Introducción a la psicología"
                />
              </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Fecha inicio (panel alumno/instructor)</Label>
                    <Input
                      type="date"
                      value={theme.start_date ?? ''}
                      onChange={(e) =>
                        updateTheme(theme.id, { start_date: e.target.value || undefined })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha fin (panel alumno/instructor)</Label>
                    <Input
                      type="date"
                      value={theme.end_date ?? ''}
                      onChange={(e) =>
                        updateTheme(theme.id, { end_date: e.target.value || undefined })
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Las fechas y evaluaciones no se muestran en la página pública /academia.
                </p>

                <CurriculumEvaluationsSection
                  courseId={courseId}
                  themeId={theme.id}
                  scopeLabel={`Tema ${themeIndex + 1}`}
                  gradingMode={gradingMode}
                  exams={exams}
                  assignments={assignments}
                  onChanged={loadEvaluations}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Subtemas
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSubtopic(theme.id)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Subtema
                    </Button>
                  </div>

                  {theme.subtopics.map((sub, subIndex) => (
                    <div
                      key={sub.id}
                      className="rounded-lg border border-[var(--color-arena)] bg-muted/20 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          Subtema {themeIndex + 1}.{subIndex + 1}
                        </span>
                        {theme.subtopics.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSubtopic(theme.id, sub.id)}
                            className="h-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>

                      <div className="mb-3 space-y-2">
                        <Label className="text-xs">Título del subtema</Label>
                        <Input
                          value={sub.title}
                          onChange={(e) =>
                            updateSubtopic(theme.id, sub.id, { title: e.target.value })
                          }
                          placeholder="Ej. Historia de la psicología"
                        />
                      </div>

                      <div className="mb-3 grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha inicio subtema</Label>
                          <Input
                            type="date"
                            value={sub.start_date ?? ''}
                            onChange={(e) =>
                              updateSubtopic(theme.id, sub.id, {
                                start_date: e.target.value || undefined,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Fecha fin subtema</Label>
                          <Input
                            type="date"
                            value={sub.end_date ?? ''}
                            onChange={(e) =>
                              updateSubtopic(theme.id, sub.id, {
                                end_date: e.target.value || undefined,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Contenido</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => addContentLine(theme.id, sub.id)}
                          >
                            + Línea
                          </Button>
                        </div>
                        {sub.content.map((line, lineIndex) => (
                          <div key={`${sub.id}-line-${lineIndex}`} className="flex gap-2">
                            <Input
                              value={line}
                              onChange={(e) =>
                                updateContentLine(theme.id, sub.id, lineIndex, e.target.value)
                              }
                              placeholder="Ej. El nacimiento de la psicología"
                            />
                            {sub.content.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0 text-destructive"
                                onClick={() => removeContentLine(theme.id, sub.id, lineIndex)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <CurriculumEvaluationsSection
                          courseId={courseId}
                          themeId={theme.id}
                          subtopicId={sub.id}
                          scopeLabel={`Subtema ${themeIndex + 1}.${subIndex + 1}`}
                          gradingMode={gradingMode}
                          exams={exams}
                          assignments={assignments}
                          onChanged={loadEvaluations}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Referencias</Label>
                  <Textarea
                    value={theme.bibliography}
                    onChange={(e) => updateTheme(theme.id, { bibliography: e.target.value })}
                    placeholder="Referencias, libros y lecturas recomendadas…"
                    rows={3}
                  />
                </div>
            </CurriculumThemeCollapsible>
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar temario'}
        </Button>
      </div>
    </div>
  );
}
