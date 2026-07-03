-- Foro del curso: preguntas y respuestas entre alumnos

CREATE TABLE IF NOT EXISTS course_forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES course_student_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES course_forum_threads(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES course_student_profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_forum_threads_course ON course_forum_threads(course_id);
CREATE INDEX IF NOT EXISTS idx_course_forum_threads_created ON course_forum_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_course_forum_replies_thread ON course_forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_course_forum_replies_created ON course_forum_replies(created_at ASC);

ALTER TABLE course_forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_forum_threads_read ON course_forum_threads;
CREATE POLICY course_forum_threads_read ON course_forum_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments e
      WHERE e.course_id = course_forum_threads.course_id
        AND e.student_id = auth.uid()
        AND e.status IN ('active', 'payment_overdue')
    )
    OR EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_forum_threads.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS course_forum_threads_insert ON course_forum_threads;
CREATE POLICY course_forum_threads_insert ON course_forum_threads
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM course_enrollments e
      WHERE e.course_id = course_forum_threads.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS course_forum_replies_read ON course_forum_replies;
CREATE POLICY course_forum_replies_read ON course_forum_replies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_forum_threads t
      JOIN course_enrollments e ON e.course_id = t.course_id
      WHERE t.id = course_forum_replies.thread_id
        AND e.student_id = auth.uid()
        AND e.status IN ('active', 'payment_overdue')
    )
    OR EXISTS (
      SELECT 1 FROM course_forum_threads t
      JOIN course_courses c ON c.id = t.course_id
      WHERE t.id = course_forum_replies.thread_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS course_forum_replies_insert ON course_forum_replies;
CREATE POLICY course_forum_replies_insert ON course_forum_replies
  FOR INSERT WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM course_forum_threads t
      JOIN course_enrollments e ON e.course_id = t.course_id
      WHERE t.id = course_forum_replies.thread_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );
