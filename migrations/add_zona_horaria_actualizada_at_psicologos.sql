-- Marca de cuándo se actualizó por última vez la zona horaria (para actualizar solo si pasaron ≥24h desde el último login).
-- Ejecutar después de add_zona_horaria_citas_psicologos.sql (una sola vez).

-- Opción A: Si tu PostgreSQL tiene TIMESTAMPTZ (local o CLI):
ALTER TABLE psicologos
  ADD COLUMN IF NOT EXISTS zona_horaria_actualizada_at TIMESTAMPTZ DEFAULT NULL;

-- Opción B: En Railway (interfaz solo permite integer/text): crea la columna a mano:
--   Table: psicologos
--   Column name: zona_horaria_actualizada_at
--   Type: text
--   Default: (vacío o null)
--   Constraint: (ninguno)
-- El código escribe NOW() y PostgreSQL guarda la fecha como texto; las comparaciones en el servidor usan ::timestamptz y funcionan igual.

COMMENT ON COLUMN psicologos.zona_horaria_actualizada_at IS 'Última vez que se detectó/actualizó la zona horaria por IP (login o botón). Se vuelve a detectar si han pasado al menos 24h desde el último login.';
