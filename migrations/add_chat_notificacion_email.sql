-- Control para no enviar correo "X está tratando de comunicarse contigo" en cada mensaje,
-- sino como máximo uno por conversación cada cierto tiempo (ej. 1 hora).
-- Ejecutar: psql -U postgres -d psicologos_en_red_db -f migrations/add_chat_notificacion_email.sql

CREATE TABLE IF NOT EXISTS chat_notificacion_email (
    destinatario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    remitente_id   INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    enviado_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (destinatario_id, remitente_id)
);

COMMENT ON TABLE chat_notificacion_email IS 'Última vez que se envió al destinatario un correo avisando que el remitente le escribió (para limitar frecuencia)';
