-- Primera sesión gratis: marca citas sin cobro Stripe.

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS es_primera_gratis BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN citas.es_primera_gratis IS
  'True si fue la primera cita del paciente y se otorgó sin cobro.';
