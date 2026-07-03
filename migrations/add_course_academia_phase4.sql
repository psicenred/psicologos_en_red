-- Módulo Academia — Fase 4 (certificados, reporting de ingresos; grabaciones usan recording_url en Fase 2)

CREATE TABLE IF NOT EXISTS course_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES course_student_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  certificate_code TEXT NOT NULL UNIQUE,
  final_grade NUMERIC NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_certificates_student ON course_certificates(student_id);
CREATE INDEX IF NOT EXISTS idx_course_certificates_course ON course_certificates(course_id);
CREATE INDEX IF NOT EXISTS idx_course_certificates_code ON course_certificates(certificate_code);

ALTER TABLE course_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_certificates_student_read ON course_certificates
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY course_certificates_instructor_read ON course_certificates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_certificates.course_id AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

-- Índice útil para buscar sesiones sin grabación (cron)
CREATE INDEX IF NOT EXISTS idx_course_live_sessions_recording_pending
  ON course_live_sessions(scheduled_at)
  WHERE recording_url IS NULL AND daily_room_name IS NOT NULL;
