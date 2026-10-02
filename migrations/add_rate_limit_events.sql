-- Rate limiting distribuido para endpoints públicos (login, chat, contacto, etc.)
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id BIGSERIAL PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_bucket_time
  ON rate_limit_events (bucket_key, created_at DESC);

-- Formularios públicos (contacto / aplica trabajo): 2 envíos/hora por IP y por email.
-- Buckets (separados por formulario):
--   public:contacto:ip:<ip>
--   public:contacto:email:<email_normalizado>
--   public:aplicacion-trabajo:ip:<ip>
--   public:aplicacion-trabajo:email:<email_normalizado>
--
-- Limpieza periódica opcional (ejecutar en cron o manualmente):
-- DELETE FROM rate_limit_events WHERE created_at < NOW() - INTERVAL '24 hours';
