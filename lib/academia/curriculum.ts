import type { StructuredCurriculum, CurriculumTheme, CurriculumSubtopic } from '@/lib/academia/types';

export function newCurriculumId(): string {
  return crypto.randomUUID();
}

export function emptyCurriculum(): StructuredCurriculum {
  return { v: 1, themes: [] };
}

export function emptyTheme(): CurriculumTheme {
  return {
    id: newCurriculumId(),
    title: '',
    subtopics: [emptySubtopic()],
    bibliography: '',
  };
}

export function emptySubtopic(): CurriculumSubtopic {
  return {
    id: newCurriculumId(),
    title: '',
    content: [''],
  };
}

export function parseCurriculum(raw: string | null | undefined): StructuredCurriculum {
  if (!raw?.trim()) return emptyCurriculum();

  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as StructuredCurriculum;
      if (parsed?.v === 1 && Array.isArray(parsed.themes)) {
        return normalizeCurriculum(parsed);
      }
    } catch {
      // fallback to legacy text
    }
  }

  return {
    v: 1,
    themes: [
      {
        id: newCurriculumId(),
        title: 'Temario',
        subtopics: [
          {
            id: newCurriculumId(),
            title: '',
            content: trimmed.split('\n').filter(Boolean),
          },
        ],
        bibliography: '',
      },
    ],
  };
}

function normalizeCurriculum(data: StructuredCurriculum): StructuredCurriculum {
  return {
    v: 1,
    themes: data.themes.map((theme) => ({
      id: theme.id || newCurriculumId(),
      title: theme.title ?? '',
      start_date: theme.start_date?.trim() || undefined,
      end_date: theme.end_date?.trim() || undefined,
      bibliography: theme.bibliography ?? '',
      subtopics: (theme.subtopics ?? []).map((sub) => ({
        id: sub.id || newCurriculumId(),
        title: sub.title ?? '',
        start_date: sub.start_date?.trim() || undefined,
        end_date: sub.end_date?.trim() || undefined,
        content: (sub.content ?? []).length > 0 ? sub.content : [''],
      })),
    })),
  };
}

export function serializeCurriculum(data: StructuredCurriculum): string {
  const cleaned: StructuredCurriculum = {
    v: 1,
    themes: data.themes.map((theme) => ({
      id: theme.id,
      title: theme.title.trim(),
      ...(theme.start_date?.trim() ? { start_date: theme.start_date.trim() } : {}),
      ...(theme.end_date?.trim() ? { end_date: theme.end_date.trim() } : {}),
      bibliography: theme.bibliography.trim(),
      subtopics: theme.subtopics
        .map((sub) => ({
          id: sub.id,
          title: sub.title.trim(),
          ...(sub.start_date?.trim() ? { start_date: sub.start_date.trim() } : {}),
          ...(sub.end_date?.trim() ? { end_date: sub.end_date.trim() } : {}),
          content: sub.content.map((line) => line.trim()).filter(Boolean),
        }))
        .filter((sub) => sub.title || sub.content.length > 0),
    })).filter((theme) => theme.title || theme.subtopics.length > 0 || theme.bibliography),
  };

  return JSON.stringify(cleaned);
}

export function hasCurriculumContent(data: StructuredCurriculum): boolean {
  return data.themes.some(
    (theme) =>
      theme.title.trim() ||
      theme.bibliography.trim() ||
      theme.subtopics.some((sub) => sub.title.trim() || sub.content.some((c) => c.trim())),
  );
}
