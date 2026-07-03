-- Contabilidad admin: marca prueba/real y fecha de pago por cita.

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS contabilidad_es_prueba BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMPTZ;

COMMENT ON COLUMN citas.contabilidad_es_prueba IS
  'Excluir de totales reales en panel contabilidad (sesiones de prueba).';
COMMENT ON COLUMN citas.fecha_pago IS
  'Momento en que se registró el pago (Stripe webhook o equivalente).';

-- Aproximación para histórico: citas pagadas usan creado_en; realizadas sin fecha_pago igual.
UPDATE citas
SET fecha_pago = creado_en
WHERE fecha_pago IS NULL
  AND (
    (stripe_payment_intent_id IS NOT NULL AND TRIM(stripe_payment_intent_id) <> '')
    OR LOWER(TRIM(estado)) = 'realizada'
  );
