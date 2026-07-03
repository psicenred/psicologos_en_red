-- Modo de calificación del curso: ponderado (0–100) o aprobado/reprobado

ALTER TABLE course_courses
  ADD COLUMN IF NOT EXISTS grading_mode TEXT NOT NULL DEFAULT 'weighted'
    CHECK (grading_mode IN ('weighted', 'pass_fail')),
  ADD COLUMN IF NOT EXISTS attendance_weight_pct NUMERIC NOT NULL DEFAULT 0
    CHECK (attendance_weight_pct >= 0 AND attendance_weight_pct <= 100);

ALTER TABLE course_final_grades
  ADD COLUMN IF NOT EXISTS pass_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (pass_status IN ('pending', 'passed', 'failed'));
