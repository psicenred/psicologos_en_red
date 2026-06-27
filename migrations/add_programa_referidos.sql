-- Programa de referidos: código personal, relación referidor→referido, crédito 50% al referidor.

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS codigo_referido TEXT,
  ADD COLUMN IF NOT EXISTS referido_por TEXT,
  ADD COLUMN IF NOT EXISTS descuento_referidor_pendiente BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_codigo_referido
  ON usuarios (codigo_referido)
  WHERE codigo_referido IS NOT NULL;

COMMENT ON COLUMN usuarios.codigo_referido IS 'Código único de 8 caracteres para link /registro?ref=';
COMMENT ON COLUMN usuarios.referido_por IS 'codigo_referido de quien invitó a registrarse';
COMMENT ON COLUMN usuarios.descuento_referidor_pendiente IS 'True cuando le corresponde 50% en su próxima cita pagada';

CREATE TABLE IF NOT EXISTS referidos (
  id SERIAL PRIMARY KEY,
  referidor_codigo TEXT NOT NULL,
  referido_user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  primera_cita_agendada_at TIMESTAMPTZ,
  descuento_referidor_otorgado BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (referido_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referidos_referidor_codigo
  ON referidos (referidor_codigo);

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS descuento_referidor_aplicado BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS monto_original INTEGER,
  ADD COLUMN IF NOT EXISTS monto_final INTEGER;

-- Backfill: códigos únicos para usuarios existentes (8 chars A-Z2-9 sin I,O,0,1)
DO $$
DECLARE
  r RECORD;
  nuevo_codigo TEXT;
  intentos INT;
  existe BOOLEAN;
BEGIN
  FOR r IN SELECT id FROM usuarios WHERE codigo_referido IS NULL OR TRIM(codigo_referido) = '' LOOP
    intentos := 0;
    LOOP
      intentos := intentos + 1;
      IF intentos > 30 THEN
        RAISE EXCEPTION 'No se pudo generar codigo_referido para usuario %', r.id;
      END IF;
      nuevo_codigo := upper(substr(md5(random()::text || clock_timestamp()::text || r.id::text), 1, 8));
      nuevo_codigo := translate(nuevo_codigo, 'IO01', 'PQRS');
      SELECT EXISTS(SELECT 1 FROM usuarios WHERE codigo_referido = nuevo_codigo) INTO existe;
      EXIT WHEN NOT existe;
    END LOOP;
    UPDATE usuarios SET codigo_referido = nuevo_codigo WHERE id = r.id;
  END LOOP;
END $$;
