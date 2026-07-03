-- Admin de academia: crea cursos y asigna instructores (no se registra en /academia/login).
-- Tras crear el usuario en Supabase Auth, insertar su UUID aquí:
--   INSERT INTO course_admin_profiles (id, full_name) VALUES ('uuid-del-auth-user', 'Nombre');

CREATE TABLE IF NOT EXISTS course_admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE course_admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS course_admin_profiles_self ON course_admin_profiles;
CREATE POLICY course_admin_profiles_self ON course_admin_profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admin puede gestionar todos los cursos (vía JWT de admin en cliente; servidor usa service role)
DROP POLICY IF EXISTS course_courses_admin ON course_courses;
CREATE POLICY course_courses_admin ON course_courses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM course_admin_profiles WHERE id = auth.uid())
  );
