-- Módulo Academia — Fase 2 (cohortes síncronas, sesiones Daily, pagos mensuales, asistencia)

-- ── Cohortes ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  live_session_weekday INT NOT NULL CHECK (live_session_weekday BETWEEN 0 AND 6),
  live_session_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_cohorts_course ON course_cohorts(course_id);

-- FK en inscripciones (columna ya existe en Fase 1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_enrollments_cohort_id_fkey'
  ) THEN
    ALTER TABLE course_enrollments
      ADD CONSTRAINT course_enrollments_cohort_id_fkey
      FOREIGN KEY (cohort_id) REFERENCES course_cohorts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Sesiones en vivo ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES course_cohorts(id) ON DELETE CASCADE,
  daily_room_url TEXT,
  daily_room_name TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  recording_url TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_live_sessions_cohort ON course_live_sessions(cohort_id);
CREATE INDEX IF NOT EXISTS idx_course_live_sessions_scheduled ON course_live_sessions(scheduled_at);

-- ── Asistencia ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_attendance (
  student_id UUID NOT NULL REFERENCES course_student_profiles(id) ON DELETE CASCADE,
  live_session_id UUID NOT NULL REFERENCES course_live_sessions(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ,
  PRIMARY KEY (student_id, live_session_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE course_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_attendance ENABLE ROW LEVEL SECURITY;

-- Cohortes publicadas: lectura si curso publicado
DROP POLICY IF EXISTS course_cohorts_public_read ON course_cohorts;
CREATE POLICY course_cohorts_public_read ON course_cohorts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_cohorts.course_id AND c.status = 'published'
    )
  );

DROP POLICY IF EXISTS course_cohorts_admin ON course_cohorts;
CREATE POLICY course_cohorts_admin ON course_cohorts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

-- Sesiones en vivo: alumno inscrito activo en la cohorte
DROP POLICY IF EXISTS course_live_sessions_enrolled ON course_live_sessions;
CREATE POLICY course_live_sessions_enrolled ON course_live_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments e
      JOIN course_cohorts ch ON ch.id = course_live_sessions.cohort_id
      WHERE e.cohort_id = ch.id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM course_cohorts ch
      JOIN course_courses c ON c.id = ch.course_id
      WHERE ch.id = course_live_sessions.cohort_id
        AND c.instructor_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS course_live_sessions_admin ON course_live_sessions;
CREATE POLICY course_live_sessions_admin ON course_live_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );

-- Asistencia: el estudiante ve/escribe la suya; instructor de su curso
DROP POLICY IF EXISTS course_attendance_student ON course_attendance;
CREATE POLICY course_attendance_student ON course_attendance
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS course_attendance_instructor_read ON course_attendance;
CREATE POLICY course_attendance_instructor_read ON course_attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_live_sessions ls
      JOIN course_cohorts ch ON ch.id = ls.cohort_id
      JOIN course_courses c ON c.id = ch.course_id
      WHERE ls.id = course_attendance.live_session_id
        AND c.instructor_id = auth.uid()
    )
  );
