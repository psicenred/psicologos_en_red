-- Reparación urgente: recalcular fecha_hora_utc en TODAS las citas desde fecha+hora+zona_horaria.
-- Ejecutar en Supabase si reagendar/cancelar falla con "24 horas" incorrectamente.

UPDATE citas c
SET zona_horaria = 'America/Mexico_City'
WHERE TRIM(COALESCE(c.zona_horaria, '')) = 'UTC';

UPDATE citas c
SET fecha_hora_utc = (
  (c.fecha + c.hora) AT TIME ZONE (
    CASE
      WHEN NULLIF(TRIM(c.zona_horaria), '') = 'UTC' THEN 'America/Mexico_City'
      ELSE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), 'America/Mexico_City')
    END
  )
)::timestamptz::text
WHERE c.fecha IS NOT NULL AND c.hora IS NOT NULL;
