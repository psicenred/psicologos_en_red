-- Módulo Academia — Fase 3 (exámenes, tareas, calificación final)

-- ── Exámenes ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  weight_pct NUMERIC NOT NULL DEFAULT 0 CHECK (weight_pct >= 0 AND weight_pct <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_exams_course ON course_exams(course_id);

CREATE TABLE IF NOT EXISTS course_exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES course_exams(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'essay')),
  question_text TEXT NOT NULL,
  options JSONB,
  points NUMERIC NOT NULL DEFAULT 1,
  order_index INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_exam_questions_exam ON course_exam_questions(exam_id);

CREATE TABLE IF NOT EXISTS course_exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES course_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES course_student_profiles(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'graded', 'released')),
  auto_score NUMERIC,
  final_score NUMERIC,
  graded_at TIMESTAMPTZ,
  UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_exam_submissions_exam ON course_exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_course_exam_submissions_student ON course_exam_submissions(student_id);

CREATE TABLE IF NOT EXISTS course_exam_answers (
  submission_id UUID NOT NULL REFERENCES course_exam_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES course_exam_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  is_correct BOOLEAN,
  points_awarded NUMERIC,
  instructor_feedback TEXT,
  PRIMARY KEY (submission_id, question_id)
);

-- ── Tareas ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instructions TEXT,
  attachment_urls TEXT[] DEFAULT '{}',
  due_date TIMESTAMPTZ NOT NULL,
  weight_pct NUMERIC NOT NULL DEFAULT 0 CHECK (weight_pct >= 0 AND weight_pct <= 100),
  late_penalty_pct_per_day NUMERIC NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_assignments_course ON course_assignments(course_id);

CREATE TABLE IF NOT EXISTS course_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES course_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES course_student_profiles(id) ON DELETE CASCADE,
  file_urls TEXT[] DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_late BOOLEAN NOT NULL DEFAULT FALSE,
  raw_score NUMERIC,
  final_score NUMERIC,
  instructor_feedback TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded')),
  UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_assignment_submissions_assignment
  ON course_assignment_submissions(assignment_id);

-- ── Calificación final ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_final_grades (
  student_id UUID NOT NULL REFERENCES course_student_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  computed_grade NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, course_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE course_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_exam_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_final_grades ENABLE ROW LEVEL SECURITY;

-- Exámenes/tareas: alumno inscrito activo puede leer
CREATE POLICY course_exams_enrolled_read ON course_exams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments e
      WHERE e.course_id = course_exams.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_exams.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_exams_instructor_write ON course_exams
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_exams.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_exams.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_exam_questions_enrolled ON course_exam_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_exams ex
      JOIN course_enrollments e ON e.course_id = ex.course_id
      WHERE ex.id = course_exam_questions.exam_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM course_exams ex
      JOIN course_courses c ON c.id = ex.course_id
      WHERE ex.id = course_exam_questions.exam_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_exam_questions_instructor_write ON course_exam_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_exams ex
      JOIN course_courses c ON c.id = ex.course_id
      WHERE ex.id = course_exam_questions.exam_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_exams ex
      JOIN course_courses c ON c.id = ex.course_id
      WHERE ex.id = course_exam_questions.exam_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_exam_submissions_student ON course_exam_submissions
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY course_exam_submissions_instructor_read ON course_exam_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_exams ex
      JOIN course_courses c ON c.id = ex.course_id
      WHERE ex.id = course_exam_submissions.exam_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_exam_submissions_instructor_update ON course_exam_submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM course_exams ex
      JOIN course_courses c ON c.id = ex.course_id
      WHERE ex.id = course_exam_submissions.exam_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_exam_answers_student ON course_exam_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_exam_submissions s
      WHERE s.id = course_exam_answers.submission_id AND s.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_exam_submissions s
      WHERE s.id = course_exam_answers.submission_id AND s.student_id = auth.uid()
    )
  );

CREATE POLICY course_exam_answers_instructor ON course_exam_answers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_exam_submissions s
      JOIN course_exams ex ON ex.id = s.exam_id
      JOIN course_courses c ON c.id = ex.course_id
      WHERE s.id = course_exam_answers.submission_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_assignments_enrolled_read ON course_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments e
      WHERE e.course_id = course_assignments.course_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_assignments.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_assignments_instructor_write ON course_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_assignments.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_assignments.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_assignment_submissions_student ON course_assignment_submissions
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY course_assignment_submissions_instructor ON course_assignment_submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_assignments a
      JOIN course_courses c ON c.id = a.course_id
      WHERE a.id = course_assignment_submissions.assignment_id
        AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY course_final_grades_student_read ON course_final_grades
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY course_final_grades_instructor ON course_final_grades
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_final_grades.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );
