-- ═══════════════════════════════════════════════════════════════════════════
-- DEMO Academia — curso completo para probar admin, instructor y alumno
-- Ejecutar DESPUÉS de fases 1–4 + add_course_admin_profiles.sql
-- ═══════════════════════════════════════════════════════════════════════════
--
-- PASO PREVIO (Supabase → Authentication → Users → Add user, Auto Confirm ✅):
--
--   Rol admin      contacto.academia@psicologosenred.com     / 123456789
--   Rol instructor profesor.academia@psicologosenred.com    / 123456789
--   Rol alumno     alumno.academia@psicologosenred.com     / 123456789
--
-- Luego ejecuta ESTE script en SQL Editor.
--
-- URLs de prueba:
--   Público:     /academia/demo-academia-completo
--   Admin:       /academia/login → /cursos/admin
--   Instructor:  /academia/login → /cursos/instructor
--   Alumno:      /academia/login → /cursos/alumno
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_admin_id UUID;
  v_instructor_id UUID;
  v_student_id UUID;
  v_course_id UUID;
  v_cohort_id UUID;
  v_module1_id UUID;
  v_module2_id UUID;
  v_lesson1_id UUID;
  v_exam_id UUID;
  v_question_id UUID;
  v_assignment_id UUID;
  v_enrollment_id UUID;
  v_demo_slug TEXT := 'demo-academia-completo';
BEGIN
  -- ── 1. Resolver UUIDs desde auth.users ───────────────────────────────────
  SELECT id INTO v_admin_id
  FROM auth.users WHERE lower(email) = lower('contacto.academia@psicologosenred.com');

  SELECT id INTO v_instructor_id
  FROM auth.users WHERE lower(email) = lower('profesor.academia@psicologosenred.com');

  SELECT id INTO v_student_id
  FROM auth.users WHERE lower(email) = lower('alumno.academia@psicologosenred.com');

  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Falta usuario Auth: profesor.academia@psicologosenred.com — créalo en Authentication → Users';
  END IF;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Falta usuario Auth: alumno.academia@psicologosenred.com — créalo en Authentication → Users';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'Aviso: no existe contacto.academia@... — el panel admin no tendrá login hasta crearlo';
  END IF;

  -- ── 2. Perfiles academia ───────────────────────────────────────────────────
  IF v_admin_id IS NOT NULL THEN
    INSERT INTO course_admin_profiles (id, full_name)
    VALUES (v_admin_id, 'Academia Psicologos en Red')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  END IF;

  INSERT INTO course_instructor_profiles (id, full_name, bio, status, revenue_share_pct)
  VALUES (
    v_instructor_id,
    'Prof. Demo Academia',
    'Instructor/a de demostración para pruebas del módulo Academia.',
    'approved',
    70
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    status = 'approved';

  INSERT INTO course_student_profiles (id, full_name, phone)
  VALUES (v_student_id, 'Alumno Demo', '+52 55 0000 0000')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- ── 3. Limpiar demo anterior (re-ejecutable) ──────────────────────────────
  DELETE FROM course_courses WHERE slug = v_demo_slug;

  -- ── 4. Curso síncrono publicado ──────────────────────────────────────────
  INSERT INTO course_courses (
    instructor_id, slug, title, description, curriculum,
    format, status, price_full, price_monthly, duration_months,
    max_students, category, level
  ) VALUES (
    v_instructor_id,
    v_demo_slug,
    'Curso demo Academia — Psicología aplicada',
    'Curso de demostración con cohorte, lecciones, examen, tarea y sesiones en vivo.',
    E'## Temario demo\n\n1. Introducción al modelo\n2. Práctica clínica online\n3. Evaluación y cierre\n\n> Usa este curso para probar admin, instructor y alumno.',
    'sync',
    'published',
    4500,
    900,
    6,
    25,
    'Demo',
    'Introductorio'
  )
  RETURNING id INTO v_course_id;

  -- ── 5. Cohorte + sesiones en vivo ────────────────────────────────────────
  INSERT INTO course_cohorts (
    course_id, start_date, end_date,
    live_session_weekday, live_session_time, timezone, status
  ) VALUES (
    v_course_id,
    CURRENT_DATE,
    (CURRENT_DATE + INTERVAL '4 months')::date,
    EXTRACT(DOW FROM CURRENT_DATE)::int,
    '18:00',
    'America/Mexico_City',
    'active'
  )
  RETURNING id INTO v_cohort_id;

  INSERT INTO course_live_sessions (cohort_id, scheduled_at, status, daily_room_name)
  VALUES
    (v_cohort_id, NOW() + INTERVAL '1 day',  'scheduled', 'demo-live-1'),
    (v_cohort_id, NOW() + INTERVAL '8 days', 'scheduled', 'demo-live-2'),
    (v_cohort_id, NOW() + INTERVAL '15 days','scheduled', 'demo-live-3');

  -- Sesión “ahora” para probar botón Unirse (ventana ±15 min en la app)
  INSERT INTO course_live_sessions (cohort_id, scheduled_at, status, daily_room_name)
  VALUES (v_cohort_id, NOW() + INTERVAL '5 minutes', 'scheduled', 'demo-live-hoy');

  -- ── 6. Módulos y lecciones ───────────────────────────────────────────────
  INSERT INTO course_modules (course_id, title, order_index)
  VALUES (v_course_id, 'Módulo 1 — Fundamentos', 0)
  RETURNING id INTO v_module1_id;

  INSERT INTO course_modules (course_id, title, order_index)
  VALUES (v_course_id, 'Módulo 2 — Práctica', 1)
  RETURNING id INTO v_module2_id;

  INSERT INTO course_lessons (module_id, title, content_type, text_content, order_index)
  VALUES (
    v_module1_id,
    'Bienvenida al curso demo',
    'text',
    E'¡Hola! Este es el contenido de la lección 1.\n\nMarca como completada para ver el progreso en el panel del alumno.',
    0
  )
  RETURNING id INTO v_lesson1_id;

  INSERT INTO course_lessons (module_id, title, content_type, text_content, order_index)
  VALUES (
    v_module1_id,
    'Marco conceptual',
    'text',
    'Contenido de la lección 2: marco teórico de referencia para el curso demo.',
    1
  );

  INSERT INTO course_lessons (module_id, title, content_type, text_content, order_index)
  VALUES (
    v_module2_id,
    'Ejercicio práctico',
    'text',
    'Contenido de la lección 3: guía de ejercicio para el alumno demo.',
    0
  );

  -- ── 7. Inscripción activa del alumno (sin pasar por Stripe) ──────────────
  INSERT INTO course_enrollments (
    student_id, course_id, cohort_id, payment_plan, status
  ) VALUES (
    v_student_id, v_course_id, v_cohort_id, 'full', 'active'
  )
  RETURNING id INTO v_enrollment_id;

  INSERT INTO course_payments (enrollment_id, amount, status, paid_at, due_date)
  VALUES (
    v_enrollment_id,
    4500,
    'paid',
    NOW(),
    CURRENT_DATE
  );

  -- Progreso parcial (1 de 3 lecciones)
  INSERT INTO course_lesson_progress (student_id, lesson_id, completed, completed_at)
  VALUES (v_student_id, v_lesson1_id, true, NOW())
  ON CONFLICT (student_id, lesson_id) DO UPDATE SET completed = true, completed_at = NOW();

  -- ── 8. Examen demo (Fase 3) ──────────────────────────────────────────────
  INSERT INTO course_exams (course_id, title, weight_pct)
  VALUES (v_course_id, 'Examen demo — opción múltiple', 40)
  RETURNING id INTO v_exam_id;

  INSERT INTO course_exam_questions (
    exam_id, question_type, question_text, options, points, order_index
  ) VALUES (
    v_exam_id,
    'multiple_choice',
    '¿Cuál es el objetivo principal de este curso demo?',
    '[
      {"id": "a", "text": "Probar el módulo Academia", "is_correct": true},
      {"id": "b", "text": "Agendar citas de terapia", "is_correct": false},
      {"id": "c", "text": "Publicar en el blog", "is_correct": false}
    ]'::jsonb,
    1,
    0
  )
  RETURNING id INTO v_question_id;

  -- ── 9. Tarea demo (Fase 3) ───────────────────────────────────────────────
  INSERT INTO course_assignments (
    course_id, title, instructions, due_date, weight_pct, late_penalty_pct_per_day
  ) VALUES (
    v_course_id,
    'Tarea demo — reflexión breve',
    'Entrega un enlace (Google Drive, PDF, etc.) con una reflexión de 1 página.',
    NOW() + INTERVAL '14 days',
    30,
    10
  )
  RETURNING id INTO v_assignment_id;

  RAISE NOTICE '✅ Demo creado';
  RAISE NOTICE '   Curso ID: %', v_course_id;
  RAISE NOTICE '   Slug: %', v_demo_slug;
  RAISE NOTICE '   Cohorte ID: %', v_cohort_id;
  RAISE NOTICE '   Página pública: /academia/%', v_demo_slug;
  RAISE NOTICE '';
  RAISE NOTICE 'Logins (contraseña sugerida: 123456789):';
  RAISE NOTICE '   Admin → contacto.academia@psicologosenred.com';
  RAISE NOTICE '   Instructor → profesor.academia@psicologosenred.com';
  RAISE NOTICE '   Alumno → alumno.academia@psicologosenred.com';
END $$;

-- Verificación rápida
SELECT c.slug, c.title, c.status, c.format, i.full_name AS instructor
FROM course_courses c
JOIN course_instructor_profiles i ON i.id = c.instructor_id
WHERE c.slug = 'demo-academia-completo';

SELECT e.status, s.full_name AS alumno, ch.start_date, ch.end_date
FROM course_enrollments e
JOIN course_student_profiles s ON s.id = e.student_id
JOIN course_cohorts ch ON ch.id = e.cohort_id
JOIN course_courses c ON c.id = e.course_id
WHERE c.slug = 'demo-academia-completo';
