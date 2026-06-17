-- Vincula cada cita con el pago en Stripe para poder reembolsar al cancelar (política 36 h).
-- Ejecutar una sola vez (local y Railway).

-- Railway: si la interfaz solo permite text/integer, crear columna a mano:
--   Name: stripe_payment_intent_id
--   Type: text
--   Default: (vacío o null)
--   Constraint: (ninguno)
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT DEFAULT NULL;

COMMENT ON COLUMN citas.stripe_payment_intent_id IS 'ID del PaymentIntent de Stripe (pi_xxx). Se guarda al completar el pago; se usa para reembolso al cancelar con 36 h de anticipación.';
