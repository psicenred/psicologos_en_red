-- Visibilidad por región: México y/o Internacional
-- Ejecutar en tu base de datos (local y Railway) una sola vez.

ALTER TABLE psicologos
  ADD COLUMN IF NOT EXISTS visible_mexico boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_internacional boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN psicologos.visible_mexico IS 'Si true, el psicólogo aparece en el catálogo para usuarios en México (MXN).';
COMMENT ON COLUMN psicologos.visible_internacional IS 'Si true, el psicólogo aparece en el catálogo para usuarios fuera de México (USD).';
