import { Link } from '@/i18n/routing';
import { parseCurriculum, hasCurriculumContent } from '@/lib/academia/curriculum';
import { CurriculumThemeCollapsible } from '@/components/features/academia/courses/CurriculumThemeCollapsible';
import {
  evaluationsForSubtopic,
  evaluationsForTheme,
  formatEvalDueDate,
  formatThemeDateRange,
  themeWeightTotal,
  unlinkedEvaluations,
} from '@/lib/academia/theme-evaluations';
import type { CourseAssignment, CourseExam, CourseGradingMode, CurriculumSubtopic } from '@/lib/academia/types';

type PanelMode = 'student' | 'instructor' | 'admin';

interface CurriculumPanelViewProps {
  raw: string | null;
  exams?: CourseExam[];
  assignments?: CourseAssignment[];
  mode?: PanelMode;
  courseId?: string;
  gradingMode?: CourseGradingMode;
}

function SubtopicBlock({
  themeIndex,
  subIndex,
  sub,
  themeId,
  exams,
  assignments,
  mode,
  courseId,
  gradingMode = 'weighted',
}: {
  themeIndex: number;
  subIndex: number;
  sub: CurriculumSubtopic;
  themeId: string;
  exams: CourseExam[];
  assignments: CourseAssignment[];
  mode: PanelMode;
  courseId?: string;
  gradingMode?: CourseGradingMode;
}) {
  const subDates = formatThemeDateRange(sub.start_date, sub.end_date);
  const { exams: subExams, assignments: subAssignments } = evaluationsForSubtopic(
    themeId,
    sub.id,
    exams,
    assignments,
  );

  return (
    <div className="rounded-lg border border-[var(--color-arena)]/60 bg-muted/10 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {sub.title ? (
          <h4 className="font-medium text-foreground">
            Subtema {themeIndex + 1}.{subIndex + 1}: {sub.title}
          </h4>
        ) : null}
        {subDates ? (
          <span className="text-xs text-muted-foreground">{subDates}</span>
        ) : null}
      </div>
      {sub.content.length > 0 ? (
        <div className="mb-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Contenido
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
            {sub.content.map((line, i) => (
              <li key={`${sub.id}-c-${i}`}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <EvalList
        label="Evaluaciones del subtema"
        exams={subExams}
        assignments={subAssignments}
        mode={mode}
        courseId={courseId}
        gradingMode={gradingMode}
      />
    </div>
  );
}

function EvalList({
  label = 'Evaluaciones del tema',
  exams,
  assignments,
  mode,
  courseId,
  gradingMode = 'weighted',
}: {
  label?: string;
  exams: CourseExam[];
  assignments: CourseAssignment[];
  mode: PanelMode;
  courseId?: string;
  gradingMode?: CourseGradingMode;
}) {
  if (exams.length === 0 && assignments.length === 0) return null;
  const showWeights = gradingMode === 'weighted';

  return (
    <div className="rounded-lg border border-[var(--color-arena)] bg-muted/20 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-2 text-sm">
        {assignments.map((a) => (
          <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium text-foreground">
              Tarea: {a.title}
              {mode === 'student' && courseId ? (
                <Link
                  href={`/cursos/alumno/${courseId}/tareas`}
                  className="ml-2 text-xs font-normal text-primary underline-offset-2 hover:underline"
                >
                  Ir a tareas
                </Link>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground">
              {showWeights ? `${Number(a.weight_pct)}%` : null}
              {showWeights && a.due_date ? ' · ' : null}
              {a.due_date ? formatEvalDueDate(a.due_date) : null}
            </span>
          </li>
        ))}
        {exams.map((e) => (
          <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium text-foreground">
              Examen: {e.title}
              {mode === 'student' && courseId ? (
                <Link
                  href={`/cursos/alumno/${courseId}/examenes`}
                  className="ml-2 text-xs font-normal text-primary underline-offset-2 hover:underline"
                >
                  Ir a exámenes
                </Link>
              ) : null}
            </span>
            <span className="text-xs text-muted-foreground">
              {showWeights ? `${Number(e.weight_pct)}%` : null}
              {showWeights && e.due_date ? ' · ' : null}
              {e.due_date ? formatEvalDueDate(e.due_date) : null}
            </span>
          </li>
        ))}
      </ul>
      {(assignments.some((a) => a.rubric) || exams.some((e) => e.rubric)) ? (
        <div className="mt-3 space-y-2 border-t border-[var(--color-arena)] pt-3">
          {assignments
            .filter((a) => a.rubric?.trim())
            .map((a) => (
              <div key={`r-${a.id}`}>
                <p className="text-xs font-semibold text-muted-foreground">Rúbrica — {a.title}</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{a.rubric}</p>
              </div>
            ))}
          {exams
            .filter((e) => e.rubric?.trim())
            .map((e) => (
              <div key={`r-${e.id}`}>
                <p className="text-xs font-semibold text-muted-foreground">Rúbrica — {e.title}</p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{e.rubric}</p>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}

export function CurriculumPanelView({
  raw,
  exams = [],
  assignments = [],
  mode = 'student',
  courseId,
  gradingMode = 'weighted',
}: CurriculumPanelViewProps) {
  const curriculum = parseCurriculum(raw);

  if (!hasCurriculumContent(curriculum)) {
    return (
      <p className="text-muted-foreground">El temario de este curso aún no está disponible.</p>
    );
  }

  const orphan = unlinkedEvaluations(exams, assignments);

  return (
    <div className="space-y-3">
      {curriculum.themes.map((theme, themeIndex) => {
        const dateRange = formatThemeDateRange(theme.start_date, theme.end_date);
        const { exams: themeExams, assignments: themeAssignments } = evaluationsForTheme(
          theme.id,
          exams,
          assignments,
        );
        const weightTotal = themeWeightTotal(theme.id, exams, assignments);

        return (
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
            meta={
              dateRange ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {dateRange}
                </span>
              ) : null
            }
          >
            {gradingMode === 'weighted' && weightTotal > 0 ? (
              <p className="-mt-1 text-xs text-muted-foreground">
                Peso evaluativo del tema: {weightTotal}% del curso
              </p>
            ) : null}

            {theme.subtopics.map((sub, subIndex) => (
              <SubtopicBlock
                key={sub.id}
                themeIndex={themeIndex}
                subIndex={subIndex}
                sub={sub}
                themeId={theme.id}
                exams={exams}
                assignments={assignments}
                mode={mode}
                courseId={courseId}
                gradingMode={gradingMode}
              />
            ))}

            {theme.bibliography.trim() ? (
              <div className="rounded-lg bg-muted/40 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Referencias
                </p>
                <p className="whitespace-pre-wrap text-sm text-foreground">{theme.bibliography}</p>
              </div>
            ) : null}

            <EvalList
              label="Evaluaciones del tema"
              exams={themeExams}
              assignments={themeAssignments}
              mode={mode}
              courseId={courseId}
              gradingMode={gradingMode}
            />
          </CurriculumThemeCollapsible>
        );
      })}

      {orphan.exams.length > 0 || orphan.assignments.length > 0 ? (
        <CurriculumThemeCollapsible
          themeId="general"
          variant="card"
          title="Evaluaciones generales (sin tema asignado)"
        >
          <EvalList
            exams={orphan.exams}
            assignments={orphan.assignments}
            mode={mode}
            courseId={courseId}
            gradingMode={gradingMode}
          />
        </CurriculumThemeCollapsible>
      ) : null}
    </div>
  );
}
