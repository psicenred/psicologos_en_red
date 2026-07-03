-- Avisos del instructor a alumnos inscritos en el curso

CREATE TABLE IF NOT EXISTS course_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES course_instructor_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_announcements_course ON course_announcements(course_id);
CREATE INDEX IF NOT EXISTS idx_course_announcements_created ON course_announcements(created_at DESC);

ALTER TABLE course_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_announcements_enrolled_read ON course_announcements;
CREATE POLICY course_announcements_enrolled_read ON course_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments e
      WHERE e.course_id = course_announcements.course_id
        AND e.student_id = auth.uid()
        AND e.status IN ('active', 'payment_overdue')
    )
    OR EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_announcements.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS course_announcements_instructor_write ON course_announcements;
CREATE POLICY course_announcements_instructor_write ON course_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_announcements.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_announcements.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );
