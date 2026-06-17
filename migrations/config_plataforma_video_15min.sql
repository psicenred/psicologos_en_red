-- Configuración de plataforma (key-value). Por ahora: regla de 15 min para botón de videollamada.
CREATE TABLE IF NOT EXISTS config_plataforma (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL DEFAULT ''
);

-- Valor por defecto: 'true' = botón de video solo se activa 15 min antes de la cita
INSERT INTO config_plataforma (clave, valor) VALUES ('video_boton_15min', 'true')
ON CONFLICT (clave) DO NOTHING;

COMMENT ON TABLE config_plataforma IS 'Configuración global de la plataforma (admin). video_boton_15min: true = botón video solo 15 min antes; false = siempre activo para citas futuras.';
