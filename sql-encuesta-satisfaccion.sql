-- Encuesta de satisfacción (se muestra la 6ta vez que inicia sesión)
-- Ejecuta este script UNA VEZ en tu base de datos PostgreSQL.

-- Columnas en usuarios (si ya existen, omite estas líneas o verás "column already exists")
ALTER TABLE usuarios ADD COLUMN veces_inicio_sesion INT DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN encuesta_satisfaccion_mostrada BOOLEAN DEFAULT FALSE;

-- Tabla opcional para guardar las respuestas (valoración y comentario)
CREATE TABLE IF NOT EXISTS encuestas_satisfaccion (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    rol VARCHAR(20) NOT NULL,
    valoracion VARCHAR(10),
    comentario TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
