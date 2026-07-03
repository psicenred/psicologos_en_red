-- Ventana de visibilidad para avisos del curso

ALTER TABLE course_announcements
  ADD COLUMN IF NOT EXISTS visible_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visible_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_course_announcements_visible
  ON course_announcements(visible_from, visible_until);

COMMENT ON COLUMN course_announcements.visible_from IS 'Inicio de publicación para alumnos (NULL = created_at)';
COMMENT ON COLUMN course_announcements.visible_until IS 'Fin de publicación para alumnos (NULL = sin fecha de fin)';
