-- Temario enriquecido: evaluaciones por tema/subtema, rúbrica y fechas
-- Ejecutar UNA sola vez en Supabase SQL Editor.
-- (Incluye columnas de add_curriculum_theme_scheduling.sql)

-- ── Exámenes ────────────────────────────────────────────────────────────────
ALTER TABLE course_exams
  ADD COLUMN IF NOT EXISTS theme_id TEXT,
  ADD COLUMN IF NOT EXISTS subtopic_id TEXT,
  ADD COLUMN IF NOT EXISTS rubric TEXT,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;

-- ── Tareas ──────────────────────────────────────────────────────────────────
ALTER TABLE course_assignments
  ADD COLUMN IF NOT EXISTS theme_id TEXT,
  ADD COLUMN IF NOT EXISTS subtopic_id TEXT,
  ADD COLUMN IF NOT EXISTS rubric TEXT;

-- ── Índices (después de crear columnas) ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_course_exams_theme ON course_exams(course_id, theme_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_theme ON course_assignments(course_id, theme_id);
CREATE INDEX IF NOT EXISTS idx_course_exams_subtopic ON course_exams(course_id, theme_id, subtopic_id);
CREATE INDEX IF NOT EXISTS idx_course_assignments_subtopic ON course_assignments(course_id, theme_id, subtopic_id);
