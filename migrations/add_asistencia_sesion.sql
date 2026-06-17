-- Migración: registrar cuándo paciente y psicólogo entran a la sala de video
-- para marcar la cita como "realizada" cuando ambos se unen.
-- Ejecutar: psql -U postgres -d psicologos_en_red_db -f migrations/add_asistencia_sesion.sql

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS paciente_entro_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS psicologo_entro_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN citas.paciente_entro_at IS 'Momento en que el paciente entró a la sala de video';
COMMENT ON COLUMN citas.psicologo_entro_at IS 'Momento en que el psicólogo entró a la sala de video';
