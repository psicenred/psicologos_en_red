-- ═══════════════════════════════════════════════════════════════════════════
-- Diplomado: Psicología Política y Comportamiento Ciudadano
-- Ejecutar DESPUÉS de fases 1–4, announcements, add_curriculum_theme_scheduling.sql
--
-- Requisitos Auth (Auto Confirm ✅):
--   profesor.academia@psicologosenred.com
--   alumno.academia@psicologosenred.com (opcional, para inscripción demo)
--
-- URL pública: /academia/diplomado-politica-psicologia
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_instructor_id UUID;
  v_student_id UUID;
  v_course_id UUID;
  v_cohort_id UUID;
  v_exam_id UUID;
  v_assignment_id UUID;
  v_enrollment_id UUID;
  v_slug TEXT := 'diplomado-politica-psicologia';
  v_curriculum JSONB;
BEGIN
  SELECT id INTO v_instructor_id
  FROM auth.users WHERE lower(email) = lower('profesor.academia@psicologosenred.com');

  SELECT id INTO v_student_id
  FROM auth.users WHERE lower(email) = lower('alumno.academia@psicologosenred.com');

  IF v_instructor_id IS NULL THEN
    RAISE EXCEPTION 'Crea el instructor en Auth: profesor.academia@psicologosenred.com';
  END IF;

  INSERT INTO course_instructor_profiles (id, full_name, bio, status, revenue_share_pct)
  VALUES (
    v_instructor_id,
    'Prof. Demo Academia',
    'Especialista en psicología social y análisis del comportamiento político.',
    'approved',
    70
  )
  ON CONFLICT (id) DO UPDATE SET status = 'approved';

  IF v_student_id IS NOT NULL THEN
    INSERT INTO course_student_profiles (id, full_name, phone)
    VALUES (v_student_id, 'Alumno Demo', '+52 55 0000 0000')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Temario estructurado (5 temas, subtemas, contenido y bibliografía)
  v_curriculum := '{
    "v": 1,
    "themes": [
      {
        "id": "a1000001-0001-4001-8001-000000000001",
        "title": "Fundamentos de la psicología política",
        "subtopics": [
          {
            "id": "a1000001-0001-4001-8001-000000000011",
            "title": "Objeto de estudio y preguntas centrales",
            "content": [
              "Definición de psicología política y su relación con ciencias sociales",
              "Nivel micro (actitudes individuales) vs. macro (cultura política)",
              "Preguntas clave: ¿por qué votamos como votamos? ¿cómo se forma la opinión pública?"
            ]
          },
          {
            "id": "a1000001-0001-4001-8001-000000000012",
            "title": "Antecedentes históricos e intelectuales",
            "content": [
              "Le Bon y la psicología de las multitudes",
              "Freud: grupo, líder y pulsión de muerte en lo social",
              "Allport y el prejuicio; Adorno y la personalidad autoritaria",
              "La psicología política en América Latina"
            ]
          },
          {
            "id": "a1000001-0001-4001-8001-000000000013",
            "title": "Métodos de investigación",
            "content": [
              "Encuestas, experimentos y estudios de caso en contexto político",
              "Sesgos cognitivos en la interpretación de datos electorales",
              "Ética en investigación con poblaciones vulnerables"
            ]
          }
        ],
        "bibliography": "Monroe, K. R. (Ed.). (2002). Political Psychology. Psychology Press.\nJost, J. T., & Sidanius, J. (Eds.). (2004). Political Psychology. Psychology Press.\nCaprara, G. V., & Vecchione, M. (2018). Personality and politics. Springer."
      },
      {
        "id": "a1000002-0002-4002-8002-000000000002",
        "title": "Identidad, ideología y comportamiento electoral",
        "subtopics": [
          {
            "id": "a1000002-0002-4002-8002-000000000021",
            "title": "Identidad social y partidismo",
            "content": [
              "Teoría de la identidad social aplicada a partidos y candidatos",
              "Identidad nacional, étnica y de género en decisiones políticas",
              "Endogrupo político, polarización afectiva y deshumanización del adversario"
            ]
          },
          {
            "id": "a1000002-0002-4002-8002-000000000022",
            "title": "Ideología, valores y personalidad",
            "content": [
              "Conservadurismo vs. liberalismo desde la psicología de la personalidad",
              "Los cinco grandes factores y orientación ideológica",
              "Valores de Schwartz y postmaterialismo (Inglehart)",
              "Autoritarismo de derechas y de izquierdas"
            ]
          },
          {
            "id": "a1000002-0002-4002-8002-000000000023",
            "title": "Voto, participación y abstencionismo",
            "content": [
              "Modelo del ciudadano racional vs. modelos heurísticos",
              "Efectos de encuestas, economía y aversión a la pérdida",
              "Participación ciudadana más allá del voto: activismo y apatía"
            ]
          }
        ],
        "bibliography": "Tajfel, H., & Turner, J. C. (1979). An integrative theory of intergroup conflict.\nHaidt, J. (2012). The Righteous Mind. Pantheon.\nGerber, A. S., & Green, D. P. (2012). Field Experiments. Norton."
      },
      {
        "id": "a1000003-0003-4003-8003-000000000003",
        "title": "Psicología de las masas y movimientos sociales",
        "subtopics": [
          {
            "id": "a1000003-0003-4003-8003-000000000031",
            "title": "Dinámica grupal y multitudes",
            "content": [
              "Contagio emocional, anonimato y desinhibición",
              "Liderazgo carismático y construcción de narrativas colectivas",
              "Multitudes físicas vs. multitudes digitales (redes sociales)"
            ]
          },
          {
            "id": "a1000003-0003-4003-8003-000000000032",
            "title": "Movimientos sociales y protesta",
            "content": [
              "Psicología de la acción colectiva y marco de oportunidad política",
              "Eficacia colectiva, identidad de movimiento y solidaridad",
              "Casos: movimientos feministas, ambientales y por derechos civiles"
            ]
          },
          {
            "id": "a1000003-0003-4003-8003-000000000033",
            "title": "Violencia política y extremismo",
            "content": [
              "Radicalización: procesos individuales y grupales",
              "Terrorismo, nacionalismo y fanatismo deportivo-político",
              "Prevención desde la psicología comunitaria"
            ]
          }
        ],
        "bibliography": "Reicher, S., & Hopkins, N. (2001). Self and Nation. Sage.\nMcCauley, C., & Moskalenko, S. (2017). Understanding Political Radicalization. Routledge.\nSnow, D. A., & Soule, S. A. (2010). A Primer on Social Movements. Norton."
      },
      {
        "id": "a1000004-0004-4004-8004-000000000004",
        "title": "Comunicación política y persuasión emocional",
        "subtopics": [
          {
            "id": "a1000004-0004-4004-8004-000000000041",
            "title": "Retórica, framing y narrativas",
            "content": [
              "Encuadres (frames) cognitivos en campañas electorales",
              "Storytelling político y construcción de enemigos comunes",
              "Metáforas conceptuales en discurso político (Lakoff)"
            ]
          },
          {
            "id": "a1000004-0004-4004-8004-000000000042",
            "title": "Emociones en política",
            "content": [
              "Miedo, esperanza, indignación y orgullo como motores del voto",
              "Populismo y apelación emocional directa",
              "Empatía política y compasión como recursos democráticos"
            ]
          },
          {
            "id": "a1000004-0004-4004-8004-000000000043",
            "title": "Medios, redes y desinformación",
            "content": [
              "Burbujas de filtro, cámaras de eco y algoritmos",
              "Fake news, conspiración y psicología de la creencia",
              "Literacidad mediática y ciudadanía digital"
            ]
          }
        ],
        "bibliography": "Lakoff, G. (2004). Don''t Think of an Elephant. Chelsea Green.\nMarcus, G. E., et al. (2000). Affective Intelligence and Political Judgment. Chicago.\nWardle, C., & Derakhshan, H. (2017). Information Disorder. Council of Europe."
      },
      {
        "id": "a1000005-0005-4005-8005-000000000005",
        "title": "Psicología aplicada a políticas públicas y convivencia",
        "subtopics": [
          {
            "id": "a1000005-0005-4005-8005-000000000051",
            "title": "Nudge y toma de decisiones públicas",
            "content": [
              "Economía del comportamiento en diseño de políticas",
              "Arquitectura de choice y paternalismo libertario",
              "Ejemplos: salud, medio ambiente y cumplimiento fiscal"
            ]
          },
          {
            "id": "a1000005-0005-4005-8005-000000000052",
            "title": "Conflicto, negociación y paz",
            "content": [
              "Psicología de la mediación y resolución de conflictos",
              "Memoria histórica, perdón y reconciliación post-conflicto",
              "Diplomacia psicológica y negociación internacional"
            ]
          },
          {
            "id": "a1000005-0005-4005-8005-000000000053",
            "title": "Psicología del liderazgo político",
            "content": [
              "Estilos de liderazgo: transformacional, transaccional y carismático",
              "Resiliencia, burnout y salud mental en cargos públicos",
              "Liderazgo femenino y barreras psicosociales en política"
            ]
          },
          {
            "id": "a1000005-0005-4005-8005-000000000054",
            "title": "Proyecto integrador del diplomado",
            "content": [
              "Diseño de intervención psicosocial en un problema político-local",
              "Presentación de caso y defensa ante cohorte",
              "Rúbrica de evaluación: rigor teórico, ética y aplicabilidad"
            ]
          }
        ],
        "bibliography": "Thaler, R., & Sunstein, C. (2008). Nudge. Yale University Press.\nFisher, R., & Ury, W. (2011). Getting to Yes. Penguin.\nNorthouse, P. G. (2021). Leadership: Theory and Practice. Sage.\nOrganización Mundial de la Salud (2013). Mental Health Action Plan."
      }
    ]
  }'::jsonb;

  -- Fechas por tema (~5 semanas cada uno, solo visibles en panel alumno/instructor)
  FOR i IN 0..4 LOOP
    v_curriculum := jsonb_set(
      v_curriculum,
      ARRAY['themes', i::text, 'start_date'],
      to_jsonb((CURRENT_DATE + (i * 35))::text)
    );
    v_curriculum := jsonb_set(
      v_curriculum,
      ARRAY['themes', i::text, 'end_date'],
      to_jsonb((CURRENT_DATE + (i * 35) + 34)::text)
    );
  END LOOP;

  -- Re-ejecutable
  DELETE FROM course_courses WHERE slug = v_slug;

  INSERT INTO course_courses (
    instructor_id, slug, title, description, curriculum,
    format, status, price_full, price_monthly, duration_months,
    max_students, category, level
  ) VALUES (
    v_instructor_id,
    v_slug,
    'Diplomado en Psicología Política y Comportamiento Ciudadano',
    E'Programa formativo de 6 meses que explora la intersección entre psicología y política: identidad, ideología, movimientos sociales, comunicación persuasiva y diseño de políticas públicas.\n\nDirigido a psicólogos, cientistas sociales, comunicadores, activistas y profesionales interesados en comprender — y actuar con mayor conciencia — en el entorno político contemporáneo.\n\nIncluye clases en vivo semanales, material asíncrono, evaluaciones y proyecto integrador.',
    v_curriculum::text,
    'sync',
    'published',
    12800,
    2400,
    6,
    40,
    'Diplomado',
    'Avanzado'
  )
  RETURNING id INTO v_course_id;

  -- Cohorte activa (6 meses) — inicio 9 de julio
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

  -- Sesiones en vivo quincenales (12 sesiones aprox.)
  INSERT INTO course_live_sessions (cohort_id, scheduled_at, status, daily_room_name)
  SELECT
    v_cohort_id,
    NOW() + (n * INTERVAL '14 days') + INTERVAL '19 hours',
    'scheduled',
    'diplomado-politica-sesion-' || n
  FROM generate_series(1, 12) AS n;

  -- Próxima sesión en ventana de "Unirse"
  INSERT INTO course_live_sessions (cohort_id, scheduled_at, status, daily_room_name)
  VALUES (v_cohort_id, NOW() + INTERVAL '10 minutes', 'scheduled', 'diplomado-politica-hoy');

  -- Examen parcial (Tema 2)
  INSERT INTO course_exams (course_id, theme_id, title, weight_pct, rubric)
  VALUES (
    v_course_id,
    'a1000002-0002-4002-8002-000000000002',
    'Examen parcial — Psicología política',
    35,
    E'Criterios:\n• Comprensión de conceptos (40%)\n• Ejemplo aplicado (40%)\n• Claridad y referencias (20%)'
  )
  RETURNING id INTO v_exam_id;

  INSERT INTO course_exam_questions (exam_id, question_type, question_text, options, points, order_index) VALUES
  (v_exam_id, 'multiple_choice',
   '¿Cuál es el foco principal de la psicología política?',
   '[{"id":"a","text":"Estudiar actitudes, emociones y comportamiento en contextos políticos","is_correct":true},{"id":"b","text":"Diagnosticar trastornos de líderes políticos","is_correct":false},{"id":"c","text":"Redactar leyes de salud mental","is_correct":false}]'::jsonb,
   1, 0),
  (v_exam_id, 'multiple_choice',
   'La teoría de la identidad social explica el partidismo porque…',
   '[{"id":"a","text":"La identidad de grupo influye en favoritismo y sesgo hacia el outgroup","is_correct":true},{"id":"b","text":"Todos los votantes son racionales e informados","is_correct":false},{"id":"c","text":"La personalidad no tiene relación con la política","is_correct":false}]'::jsonb,
   1, 1),
  (v_exam_id, 'essay',
   'Explica con un ejemplo cómo el encuadre (framing) puede cambiar la percepción de una política pública.',
   NULL, 2, 2);

  INSERT INTO course_assignments (
    course_id, theme_id, title, instructions, due_date, weight_pct, late_penalty_pct_per_day, rubric
  ) VALUES (
    v_course_id,
    'a1000003-0003-4003-8003-000000000003',
    'Ensayo — Análisis psicológico de un evento político reciente',
    E'Entrega un PDF (800–1200 palabras) analizando un evento político nacional o local desde al menos dos marcos vistos en el Tema 1–3.\n\nIncluye referencias APA.',
    NOW() + INTERVAL '45 days',
    25,
    5,
    E'Rúbrica:\n• Marco teórico (30%)\n• Análisis del caso (40%)\n• Conclusiones y APA (30%)'
  )
  RETURNING id INTO v_assignment_id;

  INSERT INTO course_assignments (
    course_id, theme_id, title, instructions, due_date, weight_pct, late_penalty_pct_per_day, rubric
  ) VALUES (
    v_course_id,
    'a1000005-0005-4005-8005-000000000005',
    'Proyecto integrador — Intervención psicosocial política',
    E'Diseña una propuesta de intervención (psicoeducación, mediación, campaña o nudge) para un problema político-comunitario.\n\nEntrega: documento + presentación de 10 min (enlace a video o PDF).',
    NOW() + INTERVAL '150 days',
    40,
    10,
    E'Rúbrica:\n• Diagnóstico psicosocial (25%)\n• Diseño de intervención (35%)\n• Viabilidad y ética (25%)\n• Presentación (15%)'
  );

  -- Aviso de bienvenida
  INSERT INTO course_announcements (course_id, instructor_id, title, body)
  VALUES (
    v_course_id,
    v_instructor_id,
    'Bienvenidos al Diplomado en Psicología Política',
    E'Estimadas y estimados participantes:

Les damos la bienvenida al diplomado. Revisen el Temario en la página del curso y la primera sesión en vivo en su panel.

Recuerden completar la lectura introductoria antes de la clase 1.

— Equipo docente'
  );

  -- Inscripción demo del alumno (opcional)
  IF v_student_id IS NOT NULL THEN
    INSERT INTO course_enrollments (student_id, course_id, cohort_id, payment_plan, status)
    VALUES (v_student_id, v_course_id, v_cohort_id, 'monthly', 'active')
    RETURNING id INTO v_enrollment_id;

    INSERT INTO course_payments (enrollment_id, amount, status, paid_at, due_date)
    VALUES (v_enrollment_id, 2400, 'paid', NOW(), CURRENT_DATE);

    INSERT INTO course_payments (enrollment_id, amount, status, due_date)
    VALUES
      (v_enrollment_id, 2400, 'pending', (CURRENT_DATE + INTERVAL '1 month')::date),
      (v_enrollment_id, 2400, 'pending', (CURRENT_DATE + INTERVAL '2 months')::date);
  END IF;

  RAISE NOTICE '✅ Diplomado creado';
  RAISE NOTICE '   Slug: %', v_slug;
  RAISE NOTICE '   Página: /academia/%', v_slug;
  RAISE NOTICE '   Admin: /cursos/admin → gestionar curso';
  RAISE NOTICE '   Temario: 5 temas con subtemas en JSON estructurado';
END $$;

-- Verificación
SELECT c.slug, c.title,
       jsonb_array_length((c.curriculum::jsonb)->'themes') AS temas,
       (c.curriculum::jsonb->'themes'->0->>'start_date') AS tema1_inicio
FROM course_courses c
WHERE c.slug = 'diplomado-politica-psicologia';

SELECT e.title AS examen, e.theme_id, e.weight_pct
FROM course_exams e
JOIN course_courses c ON c.id = e.course_id
WHERE c.slug = 'diplomado-politica-psicologia';
