-- Tipo de sesión agendada (afecta precio y se muestra en tarjetas de cita).
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS servicio_interes TEXT;

COMMENT ON COLUMN citas.servicio_interes IS
  'Tipo de servicio al agendar (ej. Terapia Individual, Terapia de Pareja). Usado para precio Stripe y UI.';
