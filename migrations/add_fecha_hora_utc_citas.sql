-- Fecha/hora de la cita en UTC (calculada al agendar). El job de recordatorios usa solo esta columna.
-- Ejecutar una sola vez (local y Railway).

-- Opción A: PostgreSQL local/CLI con tipos completos
-- ALTER TABLE citas ADD COLUMN IF NOT EXISTS fecha_hora_utc TIMESTAMPTZ DEFAULT NULL;

-- Opción B: Railway (solo permite text o integer). Crear columna en la interfaz con:
--   Name:    fecha_hora_utc
--   Type:    text
--   Default: (vacío o null)
--   Constraint: (ninguno)
-- O ejecutar si tu Railway permite ALTER con text:
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS fecha_hora_utc TEXT DEFAULT NULL;

COMMENT ON COLUMN citas.fecha_hora_utc IS 'Instante UTC de la cita en texto ISO (fecha+hora en zona_horaria). Solo para recordatorios. En consultas se usa ::timestamptz para comparar con NOW().';

-- Opcional: rellenar citas existentes (guarda el instante UTC como texto)
UPDATE citas c
SET fecha_hora_utc = ((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), 'America/Mexico_City'))::timestamptz::text
WHERE (c.fecha_hora_utc IS NULL OR c.fecha_hora_utc = '')
  AND c.fecha IS NOT NULL
  AND c.hora IS NOT NULL;
