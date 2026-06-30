-- Un pago Stripe = una cita (evita duplicados por webhook + confirmar-pago-stripe).
CREATE UNIQUE INDEX IF NOT EXISTS uq_citas_stripe_payment_intent_id
  ON citas (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL
    AND TRIM(stripe_payment_intent_id) <> '';
