-- Varios instructores por curso (tabla puente).
-- Migra instructor_id existente como instructor principal.

CREATE TABLE IF NOT EXISTS course_course_instructors (
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES course_instructor_profiles(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, instructor_id)
);

CREATE INDEX IF NOT EXISTS idx_course_course_instructors_instructor
  ON course_course_instructors(instructor_id);

INSERT INTO course_course_instructors (course_id, instructor_id, is_primary)
SELECT id, instructor_id, true
FROM course_courses
ON CONFLICT (course_id, instructor_id) DO NOTHING;

ALTER TABLE course_course_instructors ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_course_instructors_self_read ON course_course_instructors
  FOR SELECT USING (instructor_id = auth.uid());
