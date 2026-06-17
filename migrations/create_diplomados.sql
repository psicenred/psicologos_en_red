-- Tabla para gestionar diplomados desde la base de datos (página Academia)
CREATE TABLE IF NOT EXISTS diplomados (
    id SERIAL PRIMARY KEY,
    area VARCHAR(120) NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    fecha_inicio VARCHAR(100) NOT NULL DEFAULT '',
    descripcion_corta TEXT NOT NULL DEFAULT '',
    descripcion_larga TEXT NOT NULL DEFAULT '',
    url_imagen VARCHAR(500) NOT NULL DEFAULT '',
    mensaje_whatsapp VARCHAR(500) DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para listar solo activos por orden
CREATE INDEX IF NOT EXISTS idx_diplomados_activo_orden ON diplomados(activo, orden) WHERE activo = true;

-- Primer diplomado: Estructuras Clínicas (solo si no existe ya)
INSERT INTO diplomados (area, titulo, fecha_inicio, descripcion_corta, descripcion_larga, url_imagen, mensaje_whatsapp, orden, activo)
SELECT 'Clínica Avanzada', 'Estructuras Clínicas', '17 de Abril, 2026',
    'Psicosis, Neurosis y Perversión.',
    '<p>Entender el síntoma es solo el principio; el verdadero reto profesional radica en comprender la estructura que lo sostiene. Este <strong>Diplomado en Estructuras Clínicas: Neurosis, Psicosis y Perversión</strong> te ofrece, en tan solo 4 meses y de forma 100% en línea, las herramientas analíticas para distinguir la posición subjetiva de cada paciente y diseñar estrategias de intervención precisas y efectivas.</p><p>A través de un recorrido fluido por los mecanismos de represión, forclusión y renegamiento, dejarás atrás las etiquetas superficiales para dominar un diagnóstico diferencial profundo. Es la oportunidad ideal para fortalecer tu criterio clínico y responder con mayor solvencia a los desafíos del consultorio actual.</p>',
    '/images/estructuras_clinicas.jpeg',
    'Hola! Deseo más información del Diplomado en Estructuras Clínicas (Neurosis, Psicosis y Perversión)',
    0, true
WHERE NOT EXISTS (SELECT 1 FROM diplomados WHERE titulo = 'Estructuras Clínicas' LIMIT 1);
