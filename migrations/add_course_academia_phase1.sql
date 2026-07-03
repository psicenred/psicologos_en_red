-- Módulo Academia — Fase 1 (cursos async, inscripción, módulos/lecciones, progreso)
-- Ejecutar en Supabase SQL Editor. Tablas con prefijo course_ (dominio separado de terapia).

-- ── Perfiles ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'America/Mexico_City',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS course_instructor_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  bio TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  revenue_share_pct NUMERIC NOT NULL DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Cursos ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES course_instructor_profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  curriculum TEXT,
  format TEXT NOT NULL CHECK (format IN ('sync', 'async')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'archived')),
  price_full NUMERIC,
  price_monthly NUMERIC,
  duration_months INT NOT NULL DEFAULT 1,
  max_students INT NOT NULL DEFAULT 10,
  category TEXT,
  level TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_courses_instructor ON course_courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_course_courses_status ON course_courses(status);
CREATE INDEX IF NOT EXISTS idx_course_courses_slug ON course_courses(slug);

-- ── Contenido ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);

CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text'
    CHECK (content_type IN ('video', 'pdf', 'text', 'live_link')),
  video_url TEXT,
  pdf_url TEXT,
  text_content TEXT,
  order_index INT NOT NULL DEFAULT 0,
  unlock_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);

CREATE TABLE IF NOT EXISTS course_lesson_progress (
  student_id UUID NOT NULL REFERENCES course_student_profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (student_id, lesson_id)
);

-- ── Inscripciones y pagos ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES course_student_profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES course_courses(id) ON DELETE CASCADE,
  cohort_id UUID,
  payment_plan TEXT NOT NULL DEFAULT 'full'
    CHECK (payment_plan IN ('full', 'monthly')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'payment_overdue', 'paused', 'completed', 'cancelled')),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);

CREATE TABLE IF NOT EXISTS course_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES course_enrollments(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'refunded')),
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_payments_enrollment ON course_payments(enrollment_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE course_student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_instructor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_payments ENABLE ROW LEVEL SECURITY;

-- Perfiles: solo el propio usuario
CREATE POLICY course_student_profiles_self ON course_student_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY course_instructor_profiles_self ON course_instructor_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Cursos publicados: lectura pública
CREATE POLICY course_courses_public_read ON course_courses
  FOR SELECT USING (status = 'published');

-- Instructor: CRUD de sus cursos
CREATE POLICY course_courses_instructor ON course_courses
  FOR ALL USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

-- Módulos/lecciones: instructor de su curso; público si curso publicado (solo metadatos en catálogo)
CREATE POLICY course_modules_instructor ON course_modules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_modules.course_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_modules.course_id AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY course_modules_public_read ON course_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_courses c
      WHERE c.id = course_modules.course_id AND c.status = 'published'
    )
  );

CREATE POLICY course_lessons_instructor ON course_lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM course_modules m
      JOIN course_courses c ON c.id = m.course_id
      WHERE m.id = course_lessons.module_id AND c.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM course_modules m
      JOIN course_courses c ON c.id = m.course_id
      WHERE m.id = course_lessons.module_id AND c.instructor_id = auth.uid()
    )
  );

-- Lecciones: alumno inscrito activo
CREATE POLICY course_lessons_enrolled_read ON course_lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_modules m
      JOIN course_enrollments e ON e.course_id = m.course_id
      WHERE m.id = course_lessons.module_id
        AND e.student_id = auth.uid()
        AND e.status = 'active'
    )
  );

-- Progreso: solo el estudiante
CREATE POLICY course_lesson_progress_self ON course_lesson_progress
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Inscripciones: estudiante ve las suyas
CREATE POLICY course_enrollments_student ON course_enrollments
  FOR ALL USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Pagos: estudiante vía enrollment
CREATE POLICY course_payments_student ON course_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM course_enrollments e
      WHERE e.id = course_payments.enrollment_id AND e.student_id = auth.uid()
    )
  );
