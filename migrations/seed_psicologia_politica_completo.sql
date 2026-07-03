-- ═══════════════════════════════════════════════════════════════════════════
-- Diplomado Psicología y Política — datos completos para probar TODO el flujo
-- ═══════════════════════════════════════════════════════════════════════════
--
-- REQUISITOS (Supabase → Authentication):
--   Instructor (ya debe existir):
--     profesor.academia@psicologosenred.com
--
--   TÚ como alumno (créalo tú, NO viene en este script):
--     Regístrate en /academia/login con tu correo personal
--     El sistema te dará rol estudiante al registrarte
--
-- MIGRACIONES previas: fases 1–4, announcements, add_curriculum_subtopic_evaluations,
--   add_course_grading_mode (recomendado)
--
-- INSCRIPCIÓN SIN PAGO (desarrollo): ACADEMIA_SKIP_PAYMENT=true en .env
--
-- Este script NO inscribe a nadie. Tú te inscribes desde:
--   /academia/psicologia-politica-2026
--
-- URLs después de correr:
--   Público:    /academia/psicologia-politica-2026
--   Instructor: /cursos/instructor → el curso
--   Admin:      /cursos/admin
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_instructor_id UUID;
  v_course_id UUID;
  v_cohort_id UUID;
  v_exam_quiz_id UUID;
  v_exam_parcial_id UUID;
  v_exam_final_id UUID;
  v_slug TEXT := 'psicologia-politica-2026';
  v_curriculum JSONB;
  v_theme1 UUID := 'b2000001-0001-4001-8001-000000000001';
  v_theme2 UUID := 'b2000002-0002-4002-8002-000000000002';
  v_theme3 UUID := 'b2000003-0003-4003-8003-000000000003';
  v_theme4 UUID := 'b2000004-0004-4004-8004-000000000004';
  v_theme5 UUID := 'b2000005-0005-4005-8005-000000000005';
  v_sub31 UUID := 'b2000003-0003-4003-8003-000000000031';
BEGIN
  SELECT id INTO v_instructor_id
  FROM auth.users
  WHERE lower(email) = lower('profesor.academia@psicologosenred.com');

  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Crea primero el usuario instructor en Auth: profesor.academia@psicologosenred.com (Auto Confirm ✅)';
  END IF;

  INSERT INTO course_instructor_profiles (id, full_name, bio, status, revenue_share_pct)
  VALUES (
    v_instructor_id,
    'Dra. Ana Morales',
    'Psicóloga social. Docente en psicología política, comunicación y participación ciudadana.',
    'approved',
    70
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    bio = EXCLUDED.bio,
    status = 'approved';

  v_curriculum := jsonb_build_object(
    'v', 1,
    'themes', jsonb_build_array(
      jsonb_build_object(
        'id', v_theme1::text,
        'title', 'Fundamentos de la psicología política',
        'start_date', '2026-07-09',
        'end_date', '2026-08-12',
        'subtopics', jsonb_build_array(
          jsonb_build_object('id', 'b2000001-0001-4001-8001-000000000011', 'title', 'Objeto de estudio', 'content', jsonb_build_array('Definición y alcance', 'Micro vs. macro', 'Preguntas centrales')),
          jsonb_build_object('id', 'b2000001-0001-4001-8001-000000000012', 'title', 'Antecedentes históricos', 'content', jsonb_build_array('Le Bon y las multitudes', 'Freud y el grupo', 'Personalidad autoritaria')),
          jsonb_build_object('id', 'b2000001-0001-4001-8001-000000000013', 'title', 'Métodos de investigación', 'content', jsonb_build_array('Encuestas y experimentos', 'Sesgos cognitivos', 'Ética en investigación'))
        ),
        'bibliography', 'Monroe, K. R. (2002). Political Psychology. Psychology Press.'
      ),
      jsonb_build_object(
        'id', v_theme2::text,
        'title', 'Identidad, ideología y voto',
        'start_date', '2026-08-13',
        'end_date', '2026-09-16',
        'subtopics', jsonb_build_array(
          jsonb_build_object('id', 'b2000002-0002-4002-8002-000000000021', 'title', 'Identidad social y partidismo', 'content', jsonb_build_array('Endogrupo político', 'Polarización afectiva')),
          jsonb_build_object('id', 'b2000002-0002-4002-8002-000000000022', 'title', 'Ideología y personalidad', 'content', jsonb_build_array('Big Five y política', 'Autoritarismo')),
          jsonb_build_object('id', 'b2000002-0002-4002-8002-000000000023', 'title', 'Comportamiento electoral', 'content', jsonb_build_array('Voto racional vs. heurístico', 'Abstencionismo'))
        ),
        'bibliography', 'Haidt, J. (2012). The Righteous Mind. Pantheon.'
      ),
      jsonb_build_object(
        'id', v_theme3::text,
        'title', 'Masas, movimientos y violencia política',
        'start_date', '2026-09-17',
        'end_date', '2026-10-21',
        'subtopics', jsonb_build_array(
          jsonb_build_object('id', v_sub31::text, 'title', 'Dinámica de multitudes', 'content', jsonb_build_array('Contagio emocional', 'Liderazgo carismático')),
          jsonb_build_object('id', 'b2000003-0003-4003-8003-000000000032', 'title', 'Movimientos sociales', 'content', jsonb_build_array('Acción colectiva', 'Identidad de movimiento')),
          jsonb_build_object('id', 'b2000003-0003-4003-8003-000000000033', 'title', 'Radicalización', 'content', jsonb_build_array('Procesos individuales', 'Prevención comunitaria'))
        ),
        'bibliography', 'Reicher, S., & Hopkins, N. (2001). Self and Nation. Sage.'
      ),
      jsonb_build_object(
        'id', v_theme4::text,
        'title', 'Comunicación política y emociones',
        'start_date', '2026-10-22',
        'end_date', '2026-11-25',
        'subtopics', jsonb_build_array(
          jsonb_build_object('id', 'b2000004-0004-4004-8004-000000000041', 'title', 'Framing y narrativas', 'content', jsonb_build_array('Encuadres cognitivos', 'Storytelling político')),
          jsonb_build_object('id', 'b2000004-0004-4004-8004-000000000042', 'title', 'Emociones en política', 'content', jsonb_build_array('Miedo y esperanza', 'Populismo emocional')),
          jsonb_build_object('id', 'b2000004-0004-4004-8004-000000000043', 'title', 'Redes y desinformación', 'content', jsonb_build_array('Burbujas de filtro', 'Fake news'))
        ),
        'bibliography', 'Lakoff, G. (2004). Don''t Think of an Elephant. Chelsea Green.'
      ),
      jsonb_build_object(
        'id', v_theme5::text,
        'title', 'Políticas públicas, liderazgo e integración',
        'start_date', '2026-11-26',
        'end_date', '2027-01-09',
        'subtopics', jsonb_build_array(
          jsonb_build_object('id', 'b2000005-0005-4005-8005-000000000051', 'title', 'Nudge y decisiones públicas', 'content', jsonb_build_array('Economía del comportamiento', 'Diseño de políticas')),
          jsonb_build_object('id', 'b2000005-0005-4005-8005-000000000052', 'title', 'Conflicto y paz', 'content', jsonb_build_array('Mediación', 'Reconciliación')),
          jsonb_build_object('id', 'b2000005-0005-4005-8005-000000000054', 'title', 'Proyecto integrador', 'content', jsonb_build_array('Diseño de intervención', 'Defensa ante cohorte'))
        ),
        'bibliography', 'Thaler, R., & Sunstein, C. (2008). Nudge. Yale University Press.'
      )
    )
  );

  -- Re-ejecutable
  DELETE FROM course_courses WHERE slug = v_slug;

  INSERT INTO course_courses (
    instructor_id, slug, title, description, curriculum,
    format, status, price_full, price_monthly, duration_months,
    max_students, category, level,
    grading_mode, attendance_weight_pct
  ) VALUES (
    v_instructor_id,
    v_slug,
    'Diplomado en Psicología Política y Comportamiento Ciudadano',
    E'Programa de 6 meses en línea con clases en vivo. Explora identidad política, movimientos sociales, comunicación persuasiva y aplicación en políticas públicas.\n\nIncluye evaluaciones ponderadas, asistencia a sesiones en vivo y proyecto integrador.\n\nEdición que inicia el 9 de julio de 2026.',
    v_curriculum::text,
    'sync',
    'published',
    12800,
    2400,
    6,
    40,
    'Diplomado',
    'Avanzado',
    'weighted',
    10
  )
  RETURNING id INTO v_course_id;

  -- Una cohorte (martes 19:00 CDMX)
  INSERT INTO course_cohorts (
    course_id, start_date, end_date,
    live_session_weekday, live_session_time, timezone, status
  ) VALUES (
    v_course_id,
    '2026-07-09',
    '2027-01-09',
    2,
    '19:00',
    'America/Mexico_City',
    'upcoming'
  )
  RETURNING id INTO v_cohort_id;

  -- Sesiones en vivo semanales (martes) + una sesión "ahora" para probar Unirse
  INSERT INTO course_live_sessions (cohort_id, scheduled_at, status, daily_room_name)
  SELECT
    v_cohort_id,
    d AT TIME ZONE 'America/Mexico_City',
    'scheduled',
    'psic-pol-2026-s' || ROW_NUMBER() OVER (ORDER BY d)
  FROM generate_series(
    TIMESTAMPTZ '2026-07-14 19:00:00-06',
    TIMESTAMPTZ '2027-01-06 19:00:00-06',
    INTERVAL '7 days'
  ) AS d;

  INSERT INTO course_live_sessions (cohort_id, scheduled_at, status, daily_room_name)
  VALUES (v_cohort_id, NOW() + INTERVAL '15 minutes', 'scheduled', 'psic-pol-2026-hoy');

  -- ── Evaluaciones: exámenes 50% + tareas 40% + asistencia 10% = 100% ─────

  -- Quiz diagnóstico — Tema 1 (10%)
  INSERT INTO course_exams (course_id, theme_id, title, weight_pct, rubric, due_date)
  VALUES (
    v_course_id, v_theme1::text,
    'Quiz diagnóstico — Fundamentos',
    10,
    E'• Conceptos clave del tema 1\n• Una respuesta abierta breve',
    TIMESTAMPTZ '2026-08-01 23:59:00-06'
  )
  RETURNING id INTO v_exam_quiz_id;

  INSERT INTO course_exam_questions (exam_id, question_type, question_text, options, points, order_index) VALUES
  (v_exam_quiz_id, 'multiple_choice',
   'La psicología política estudia principalmente…',
   '[{"id":"a","text":"Actitudes y comportamiento en contextos políticos","is_correct":true},{"id":"b","text":"Solo encuestas electorales","is_correct":false}]'::jsonb,
   1, 0),
  (v_exam_quiz_id, 'essay',
   'Define en 150 palabras qué es la polarización afectiva.',
   NULL, 2, 1);

  -- Examen parcial — Tema 2 (25%)
  INSERT INTO course_exams (course_id, theme_id, title, weight_pct, rubric, due_date)
  VALUES (
    v_course_id, v_theme2::text,
    'Examen parcial — Identidad y voto',
    25,
    E'Criterios:\n• Comprensión teórica (40%)\n• Ejemplo mexicano o latinoamericano (40%)\n• Redacción y referencias (20%)',
    TIMESTAMPTZ '2026-09-20 23:59:00-06'
  )
  RETURNING id INTO v_exam_parcial_id;

  INSERT INTO course_exam_questions (exam_id, question_type, question_text, options, points, order_index) VALUES
  (v_exam_parcial_id, 'multiple_choice',
   'Según la teoría de la identidad social, el partidismo se refuerza por…',
   '[{"id":"a","text":"Favoritismo endogrupal y sesgo hacia el adversario","is_correct":true},{"id":"b","text":"Información perfecta del electorado","is_correct":false}]'::jsonb,
   1, 0),
  (v_exam_parcial_id, 'multiple_choice',
   'El modelo heurístico del voto sugiere que…',
   '[{"id":"a","text":"Usamos atajos cognitivos ante complejidad política","is_correct":true},{"id":"b","text":"Todos calculamos utilidad esperada","is_correct":false}]'::jsonb,
   1, 1),
  (v_exam_parcial_id, 'essay',
   'Analiza un caso reciente donde la identidad social haya influido en un debate público.',
   NULL, 3, 2);

  -- Examen final — Tema 5 (15%)
  INSERT INTO course_exams (course_id, theme_id, title, weight_pct, rubric, due_date)
  VALUES (
    v_course_id, v_theme5::text,
    'Examen final integrador',
    15,
    E'Integra al menos tres temas del diplomado en tu respuesta.',
    TIMESTAMPTZ '2027-01-05 23:59:00-06'
  )
  RETURNING id INTO v_exam_final_id;

  INSERT INTO course_exam_questions (exam_id, question_type, question_text, options, points, order_index) VALUES
  (v_exam_final_id, 'essay',
   '¿Cómo aplicarías herramientas de psicología política para mejorar la participación ciudadana en tu contexto?',
   NULL, 5, 0),
  (v_exam_final_id, 'essay',
   'Discute los riesgos éticos de usar nudges en políticas públicas.',
   NULL, 5, 1);

  -- Tarea ensayo — Tema 3 (20%)
  INSERT INTO course_assignments (
    course_id, theme_id, title, instructions, due_date, weight_pct, late_penalty_pct_per_day, rubric
  ) VALUES (
    v_course_id, v_theme3::text,
    'Ensayo — Análisis psicológico de un movimiento social',
    E'PDF de 800–1200 palabras. Analiza un movimiento reciente con dos marcos del temario.\nReferencias APA.',
    TIMESTAMPTZ '2026-10-25 23:59:00-06',
    20, 5,
    E'• Marco teórico (30%)\n• Análisis (45%)\n• Conclusiones y APA (25%)'
  );

  -- Tarea por subtema — multitudes (10%)
  INSERT INTO course_assignments (
    course_id, theme_id, subtopic_id, title, instructions, due_date, weight_pct, late_penalty_pct_per_day, rubric
  ) VALUES (
    v_course_id, v_theme3::text, v_sub31::text,
    'Ficha técnica — Dinámica de una multitud',
    E'Entrega una ficha de 2 páginas describiendo un evento de multitud (física o digital): emociones, liderazgo, contagio.',
    TIMESTAMPTZ '2026-10-10 23:59:00-06',
    10, 5,
    E'• Descripción del evento (40%)\n• Conceptos del subtema (40%)\n• Formato (20%)'
  );

  -- Proyecto integrador — Tema 5 (10%)
  INSERT INTO course_assignments (
    course_id, theme_id, title, instructions, due_date, weight_pct, late_penalty_pct_per_day, rubric
  ) VALUES (
    v_course_id, v_theme5::text,
    'Proyecto integrador — Intervención psicosocial política',
    E'Propuesta de intervención (psicoeducación, mediación, campaña o nudge) para un problema comunitario-político.\nEntrega: documento PDF + enlace a presentación (10 min).',
    TIMESTAMPTZ '2027-01-08 23:59:00-06',
    10, 10,
    E'• Diagnóstico (25%)\n• Diseño (35%)\n• Ética y viabilidad (25%)\n• Presentación (15%)'
  );

  -- Avisos
  INSERT INTO course_announcements (course_id, instructor_id, title, body) VALUES
  (
    v_course_id, v_instructor_id,
    'Bienvenida — Edición julio 2026',
    E'¡Bienvenidas y bienvenidos al diplomado!

Revisen el temario en su panel y la primera sesión en vivo (martes 19:00 CDMX).

La inscripción los coloca automáticamente en la cohorte de julio.

— Dra. Ana Morales'
  ),
  (
    v_course_id, v_instructor_id,
    'Recordatorio: quiz diagnóstico',
    E'El quiz del Tema 1 vence pronto. Lo encuentran en Exámenes del panel del curso.

Cualquier duda, escríbanme por el foro o en la clase en vivo.'
  );

  RAISE NOTICE '════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ Curso creado: %', v_slug;
  RAISE NOTICE '   Público: /academia/%', v_slug;
  RAISE NOTICE '   Instructor: profesor.academia@psicologosenred.com';
  RAISE NOTICE '   Alumno: regístrate con TU correo → inscríbete en la página del curso';
  RAISE NOTICE '   Ponderación: quiz 10 + parcial 25 + final 15 + tareas 40 + asistencia 10 = 100%%';
  RAISE NOTICE '   Sesiones en vivo: % (+ 1 sesión de prueba "ahora")',
    (SELECT COUNT(*) FROM course_live_sessions WHERE cohort_id = v_cohort_id) - 1;
  RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

-- Verificación rápida
SELECT c.slug, c.title, c.status, c.grading_mode, c.attendance_weight_pct,
       (SELECT COUNT(*) FROM course_cohorts ch WHERE ch.course_id = c.id) AS cohortes,
       (SELECT COUNT(*) FROM course_live_sessions ls
        JOIN course_cohorts ch ON ch.id = ls.cohort_id WHERE ch.course_id = c.id) AS sesiones,
       (SELECT COUNT(*) FROM course_exams e WHERE e.course_id = c.id) AS examenes,
       (SELECT COUNT(*) FROM course_assignments a WHERE a.course_id = c.id) AS tareas,
       (SELECT COALESCE(SUM(weight_pct), 0) FROM course_exams e WHERE e.course_id = c.id)
         + (SELECT COALESCE(SUM(weight_pct), 0) FROM course_assignments a WHERE a.course_id = c.id)
         + c.attendance_weight_pct AS peso_total
FROM course_courses c
WHERE c.slug = 'psicologia-politica-2026';

SELECT 'inscripciones (debe ser 0 hasta que te inscribas)' AS nota,
       COUNT(*) AS total
FROM course_enrollments e
JOIN course_courses c ON c.id = e.course_id
WHERE c.slug = 'psicologia-politica-2026';
