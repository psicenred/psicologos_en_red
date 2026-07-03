-- Publicar un aviso de prueba en el curso demo
-- Requisitos:
--   1. Tabla course_announcements (migrations/add_course_academia_announcements.sql)
--   2. Seed demo corrido (migrations/seed_academia_demo_completo.sql)
--   3. Instructor: profesor.academia@psicologosenred.com

DO $$
DECLARE
  v_course_id UUID;
  v_instructor_id UUID;
  v_title TEXT := 'Bienvenida al curso demo';
  v_body TEXT := 'Hola a todos y todas:

Este es un aviso de prueba publicado por el instructor.

• Revisen la sección Contenido esta semana.
• La primera tarea estará disponible pronto.
• Cualquier duda, escríbanme por el canal del curso.

¡Nos vemos en clase!';
BEGIN
  SELECT c.id, c.instructor_id
  INTO v_course_id, v_instructor_id
  FROM course_courses c
  WHERE c.slug = 'demo-academia-completo';

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'No existe el curso demo-academia-completo. Corre seed_academia_demo_completo.sql primero.';
  END IF;

  INSERT INTO course_announcements (course_id, instructor_id, title, body)
  VALUES (v_course_id, v_instructor_id, v_title, v_body);

  RAISE NOTICE 'Aviso publicado en curso demo (id: %)', v_course_id;
  RAISE NOTICE 'Ver como alumno: /cursos/alumno (alumno.academia@psicologosenred.com)';
END $$;

-- Ver avisos del curso demo
SELECT
  a.id,
  a.title,
  a.body,
  a.created_at,
  c.title AS curso,
  i.full_name AS instructor
FROM course_announcements a
JOIN course_courses c ON c.id = a.course_id
JOIN course_instructor_profiles i ON i.id = a.instructor_id
WHERE c.slug = 'demo-academia-completo'
ORDER BY a.created_at DESC;
