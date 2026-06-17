-- Recordatorio por correo 30 min antes de la cita (enviado una sola vez por cita).
-- Ejecutar: psql -U postgres -d psicologos_en_red_db -f migrations/add_recordatorio_cita.sql

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS recordatorio_enviado_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN citas.recordatorio_enviado_at IS 'Momento en que se envió el correo de recordatorio 30 min antes de la cita';
