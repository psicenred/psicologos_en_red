-- Zona horaria del paciente (IANA) para emails y visualización fuera del navegador.
-- Ejecutar una sola vez en Supabase.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS zona_horaria VARCHAR(64) DEFAULT NULL;

COMMENT ON COLUMN usuarios.zona_horaria IS 'Zona horaria IANA del paciente (ej. Asia/Tokyo). Se actualiza al agendar/reagendar desde el navegador.';

-- Corregir citas legacy de Railway con zona UTC
UPDATE citas
SET zona_horaria = 'America/Mexico_City'
WHERE TRIM(COALESCE(zona_horaria, '')) = 'UTC';

-- Rellenar fecha_hora_utc faltante usando zona_horaria de la cita
UPDATE citas c
SET fecha_hora_utc = (
  (c.fecha + c.hora) AT TIME ZONE COALESCE(
    NULLIF(TRIM(c.zona_horaria), ''),
    'America/Mexico_City'
  )
)::timestamptz::text
WHERE (c.fecha_hora_utc IS NULL OR TRIM(c.fecha_hora_utc) = '')
  AND c.fecha IS NOT NULL
  AND c.hora IS NOT NULL;
