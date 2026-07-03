import { parseCurriculum, hasCurriculumContent } from '@/lib/academia/curriculum';
import { CurriculumThemeCollapsible } from '@/components/features/academia/courses/CurriculumThemeCollapsible';
import type { CurriculumSubtopic } from '@/lib/academia/types';

function SubtopicBlock({
  themeIndex,
  subIndex,
  sub,
}: {
  themeIndex: number;
  subIndex: number;
  sub: CurriculumSubtopic;
}) {
  return (
    <div className="border-l-2 border-primary/30 pl-4">
      {sub.title ? (
        <h4 className="mb-2 font-medium text-foreground">
          Subtema {themeIndex + 1}.{subIndex + 1}: {sub.title}
        </h4>
      ) : null}
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
    </div>
  );
}

export function CurriculumDisplay({
  raw,
  variant = 'full',
}: {
  raw: string | null;
  variant?: 'full' | 'outline';
}) {
  const curriculum = parseCurriculum(raw);

  if (!hasCurriculumContent(curriculum)) return null;

  const outline = variant === 'outline';

  return (
    <div className="space-y-3">
      {curriculum.themes.map((theme, themeIndex) => (
        <CurriculumThemeCollapsible
          key={theme.id}
          themeId={theme.id}
          defaultOpen={themeIndex === 0}
          title={
            <>
              Tema {themeIndex + 1}
              {theme.title ? `: ${theme.title}` : ''}
            </>
          }
        >
          {theme.subtopics.map((sub, subIndex) =>
            outline ? (
              sub.title ? (
                <p key={sub.id} className="text-sm text-foreground">
                  {themeIndex + 1}.{subIndex + 1} {sub.title}
                </p>
              ) : null
            ) : (
              <SubtopicBlock key={sub.id} themeIndex={themeIndex} subIndex={subIndex} sub={sub} />
            ),
          )}

          {!outline && theme.bibliography.trim() ? (
            <div className="rounded-lg bg-muted/40 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Referencias
              </p>
              <p className="whitespace-pre-wrap text-sm text-foreground">{theme.bibliography}</p>
            </div>
          ) : null}
        </CurriculumThemeCollapsible>
      ))}
    </div>
  );
}
