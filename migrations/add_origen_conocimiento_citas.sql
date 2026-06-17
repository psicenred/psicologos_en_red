-- Origen de conocimiento (solo primera vez que agendan). Opcional. Tipo TEXT (en Railway sin VARCHAR).
ALTER TABLE citas ADD COLUMN IF NOT EXISTS origen_conocimiento TEXT DEFAULT NULL;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS recomendado_por TEXT DEFAULT NULL;
COMMENT ON COLUMN citas.origen_conocimiento IS 'Cómo se enteró de la plataforma: TikTok, Instagram, Facebook, Google, YouTube, Recomendación (solo primera cita, opcional).';
COMMENT ON COLUMN citas.recomendado_por IS 'Si origen_conocimiento = Recomendación, nombre de quien lo recomendó (opcional).';
