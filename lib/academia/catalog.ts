import { getOpenEnrollmentCohort, formatCohortStartLabel } from '@/lib/academia/cohorts';
import { hasCurriculumContent, parseCurriculum } from '@/lib/academia/curriculum';
import { listPublishedCourses } from '@/lib/academia/courses';
import type { CourseFormat } from '@/lib/academia/types';

export interface AcademiaCatalogCourse {
  id: string;
  slug: string;
  titulo: string;
  area: string;
  fecha_inicio: string | null;
  descripcion_corta: string;
  url_imagen: string;
  curriculum: string | null;
  has_curriculum: boolean;
  format: CourseFormat;
}

function formatArea(category: string | null, format: CourseFormat): string {
  if (category?.trim()) return category.trim();
  return format === 'sync' ? 'Curso Virtual' : 'Curso en línea';
}

function shortDescription(description: string | null): string {
  if (!description?.trim()) return '';
  const first = description.split('\n').find((line) => line.trim());
  return (first ?? description).trim().slice(0, 280);
}

export async function listPublishedCoursesForCatalog(): Promise<AcademiaCatalogCourse[]> {
  const courses = await listPublishedCourses();

  return Promise.all(
    courses.map(async (course) => {
      const cohort = await getOpenEnrollmentCohort(course.id);
      const curriculum = course.curriculum ?? null;

      return {
        id: course.id,
        slug: course.slug,
        titulo: course.title,
        area: formatArea(course.category, course.format),
        fecha_inicio: cohort ? formatCohortStartLabel(cohort.start_date) : null,
        descripcion_corta: shortDescription(course.description),
        url_imagen: course.thumbnail_url?.trim() ?? '',
        curriculum,
        has_curriculum: hasCurriculumContent(parseCurriculum(curriculum)),
        format: course.format,
      };
    }),
  );
}
