-- ═══════════════════════════════════════════════════════════════════════════
-- Eliminar por completo el diplomado de Psicología Política
-- Slug: diplomado-politica-psicologia
--
-- Borra en cascada: cohortes, sesiones en vivo, asistencia, inscripciones,
-- pagos, exámenes, tareas, avisos, certificados, calificaciones, módulos, etc.
--
-- NO borra: usuarios Auth, perfiles de instructor/alumno/admin.
-- Ejecutar en Supabase → SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_slug TEXT := 'diplomado-politica-psicologia';
  v_course_id UUID;
  v_deleted INT;
BEGIN
  SELECT id INTO v_course_id
  FROM course_courses
  WHERE slug = v_slug;

  IF v_course_id IS NULL THEN
    RAISE NOTICE 'No existe ningún curso con slug "%". Nada que borrar.', v_slug;
    RETURN;
  END IF;

  RAISE NOTICE 'Curso encontrado: % (id: %)', v_slug, v_course_id;

  -- Resumen antes de borrar (solo informativo)
  RAISE NOTICE '── Registros vinculados ──';
  RAISE NOTICE 'Cohortes: %', (SELECT COUNT(*) FROM course_cohorts WHERE course_id = v_course_id);
  RAISE NOTICE 'Sesiones en vivo: %', (
    SELECT COUNT(*) FROM course_live_sessions ls
    JOIN course_cohorts ch ON ch.id = ls.cohort_id
    WHERE ch.course_id = v_course_id
  );
  RAISE NOTICE 'Inscripciones: %', (SELECT COUNT(*) FROM course_enrollments WHERE course_id = v_course_id);
  RAISE NOTICE 'Exámenes: %', (SELECT COUNT(*) FROM course_exams WHERE course_id = v_course_id);
  RAISE NOTICE 'Tareas: %', (SELECT COUNT(*) FROM course_assignments WHERE course_id = v_course_id);
  RAISE NOTICE 'Avisos: %', (SELECT COUNT(*) FROM course_announcements WHERE course_id = v_course_id);
  RAISE NOTICE 'Módulos: %', (SELECT COUNT(*) FROM course_modules WHERE course_id = v_course_id);

  -- Borrado principal (CASCADE en tablas hijas)
  DELETE FROM course_courses WHERE id = v_course_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 1 THEN
    RAISE NOTICE '✅ Curso "%" eliminado con todo su contenido.', v_slug;
  ELSE
    RAISE EXCEPTION 'No se pudo eliminar el curso %', v_slug;
  END IF;
END $$;

-- Verificación: no debe devolver filas
SELECT id, slug, title
FROM course_courses
WHERE slug = 'diplomado-politica-psicologia';

-- Huérfanos residuales (deberían ser 0)
SELECT 'cohortes' AS tabla, COUNT(*) AS restantes
FROM course_cohorts ch
WHERE NOT EXISTS (SELECT 1 FROM course_courses c WHERE c.id = ch.course_id)
UNION ALL
SELECT 'inscripciones', COUNT(*)
FROM course_enrollments e
WHERE NOT EXISTS (SELECT 1 FROM course_courses c WHERE c.id = e.course_id)
UNION ALL
SELECT 'examenes', COUNT(*)
FROM course_exams ex
WHERE NOT EXISTS (SELECT 1 FROM course_courses c WHERE c.id = ex.course_id);
