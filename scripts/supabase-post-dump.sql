-- Ejecutar en Supabase SQL Editor DESPUÉS de railway_full_dump.sql

-- ===== migrations/visible_mexico_internacional_psicologos.sql =====
-- Visibilidad por región: México y/o Internacional
-- Ejecutar en tu base de datos (local y Railway) una sola vez.

ALTER TABLE psicologos
  ADD COLUMN IF NOT EXISTS visible_mexico boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS visible_internacional boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN psicologos.visible_mexico IS 'Si true, el psicólogo aparece en el catálogo para usuarios en México (MXN).';
COMMENT ON COLUMN psicologos.visible_internacional IS 'Si true, el psicólogo aparece en el catálogo para usuarios fuera de México (USD).';

-- ===== migrations/create_blog_articulos.sql =====
CREATE TABLE IF NOT EXISTS blog_articulos (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(220) NOT NULL,
    slug VARCHAR(260) UNIQUE,
    autor VARCHAR(140) DEFAULT 'Equipo Psicólogos en Red' NOT NULL,
    tiempo_lectura INTEGER DEFAULT 5 NOT NULL,
    meta_title VARCHAR(260),
    meta_description VARCHAR(320),
    palabras_clave TEXT[] DEFAULT '{}'::text[] NOT NULL,
    contenido_html TEXT NOT NULL,
    extracto TEXT DEFAULT ''::text NOT NULL,
    portada_url TEXT,
    publicado BOOLEAN DEFAULT true NOT NULL,
    fecha_publicacion TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    creado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blog_articulos_publicado_fecha
ON blog_articulos (publicado, fecha_publicacion DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_articulos_slug
ON blog_articulos (slug)
WHERE slug IS NOT NULL;

-- ===== migrations/create_diplomados.sql =====
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

-- ===== migrations/config_plataforma_video_15min.sql =====
-- Configuración de plataforma (key-value). Por ahora: regla de 15 min para botón de videollamada.
CREATE TABLE IF NOT EXISTS config_plataforma (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL DEFAULT ''
);

-- Valor por defecto: 'true' = botón de video solo se activa 15 min antes de la cita
INSERT INTO config_plataforma (clave, valor) VALUES ('video_boton_15min', 'true')
ON CONFLICT (clave) DO NOTHING;

COMMENT ON TABLE config_plataforma IS 'Configuración global de la plataforma (admin). video_boton_15min: true = botón video solo 15 min antes; false = siempre activo para citas futuras.';

-- ===== migrations/add_recordatorio_cita.sql =====
-- Recordatorio por correo 30 min antes de la cita (enviado una sola vez por cita).
-- Ejecutar: psql -U postgres -d psicologos_en_red_db -f migrations/add_recordatorio_cita.sql

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS recordatorio_enviado_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN citas.recordatorio_enviado_at IS 'Momento en que se envió el correo de recordatorio 30 min antes de la cita';

-- ===== migrations/add_zona_horaria_citas_psicologos.sql =====
-- Zonas horarias para citas y psicólogos (recordatorios y visualización correctos).
-- Ejecutar en local y en Railway una sola vez.

-- Psicólogo: zona horaria en la que trabaja (sus horarios y citas se interpretan aquí).
ALTER TABLE psicologos
  ADD COLUMN IF NOT EXISTS zona_horaria VARCHAR(64) NOT NULL DEFAULT 'America/Mexico_City';

COMMENT ON COLUMN psicologos.zona_horaria IS 'Zona horaria IANA (ej. America/Mexico_City) en la que el psicólogo trabaja; las citas con él se interpretan en esta zona.';

-- Cita: zona horaria en la que se agendó (normalmente la del psicólogo al momento de agendar).
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS zona_horaria VARCHAR(64) NOT NULL DEFAULT 'America/Mexico_City';

COMMENT ON COLUMN citas.zona_horaria IS 'Zona horaria en la que se interpreta fecha+hora de esta cita (ej. America/Mexico_City). Usada para recordatorios y para mostrar la hora correcta al usuario.';

-- ===== migrations/add_fecha_hora_utc_citas.sql =====
-- Fecha/hora de la cita en UTC (calculada al agendar). El job de recordatorios usa solo esta columna.
-- Ejecutar una sola vez (local y Railway).

-- Opción A: PostgreSQL local/CLI con tipos completos
-- ALTER TABLE citas ADD COLUMN IF NOT EXISTS fecha_hora_utc TIMESTAMPTZ DEFAULT NULL;

-- Opción B: Railway (solo permite text o integer). Crear columna en la interfaz con:
--   Name:    fecha_hora_utc
--   Type:    text
--   Default: (vacío o null)
--   Constraint: (ninguno)
-- O ejecutar si tu Railway permite ALTER con text:
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS fecha_hora_utc TEXT DEFAULT NULL;

COMMENT ON COLUMN citas.fecha_hora_utc IS 'Instante UTC de la cita en texto ISO (fecha+hora en zona_horaria). Solo para recordatorios. En consultas se usa ::timestamptz para comparar con NOW().';

-- Opcional: rellenar citas existentes (guarda el instante UTC como texto)
UPDATE citas c
SET fecha_hora_utc = ((c.fecha + c.hora) AT TIME ZONE COALESCE(NULLIF(TRIM(c.zona_horaria), ''), 'America/Mexico_City'))::timestamptz::text
WHERE (c.fecha_hora_utc IS NULL OR c.fecha_hora_utc = '')
  AND c.fecha IS NOT NULL
  AND c.hora IS NOT NULL;

-- ===== migrations/add_stripe_payment_intent_id_citas.sql =====
-- Vincula cada cita con el pago en Stripe para poder reembolsar al cancelar (política 36 h).
-- Ejecutar una sola vez (local y Railway).

-- Railway: si la interfaz solo permite text/integer, crear columna a mano:
--   Name: stripe_payment_intent_id
--   Type: text
--   Default: (vacío o null)
--   Constraint: (ninguno)
ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT DEFAULT NULL;

COMMENT ON COLUMN citas.stripe_payment_intent_id IS 'ID del PaymentIntent de Stripe (pi_xxx). Se guarda al completar el pago; se usa para reembolso al cancelar con 36 h de anticipación.';

-- ===== migrations/add_zona_horaria_actualizada_at_psicologos.sql =====
-- Marca de cuándo se actualizó por última vez la zona horaria (para actualizar solo si pasaron ≥24h desde el último login).
-- Ejecutar después de add_zona_horaria_citas_psicologos.sql (una sola vez).

-- Opción A: Si tu PostgreSQL tiene TIMESTAMPTZ (local o CLI):
ALTER TABLE psicologos
  ADD COLUMN IF NOT EXISTS zona_horaria_actualizada_at TIMESTAMPTZ DEFAULT NULL;

-- Opción B: En Railway (interfaz solo permite integer/text): crea la columna a mano:
--   Table: psicologos
--   Column name: zona_horaria_actualizada_at
--   Type: text
--   Default: (vacío o null)
--   Constraint: (ninguno)
-- El código escribe NOW() y PostgreSQL guarda la fecha como texto; las comparaciones en el servidor usan ::timestamptz y funcionan igual.

COMMENT ON COLUMN psicologos.zona_horaria_actualizada_at IS 'Última vez que se detectó/actualizó la zona horaria por IP (login o botón). Se vuelve a detectar si han pasado al menos 24h desde el último login.';

-- ===== migrations/add_contacto_emergencia_usuarios.sql =====
-- Contacto de emergencia para pacientes (perfil → Configuración)
-- Ejecutar una vez en tu base de datos (local y Railway).

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS contacto_emergencia text NULL;

COMMENT ON COLUMN usuarios.contacto_emergencia IS 'Nombre y/o teléfono de contacto en caso de emergencia (editable en perfil).';

-- ===== migrations/add_origen_conocimiento_citas.sql =====
-- Origen de conocimiento (solo primera vez que agendan). Opcional. Tipo TEXT (en Railway sin VARCHAR).
ALTER TABLE citas ADD COLUMN IF NOT EXISTS origen_conocimiento TEXT DEFAULT NULL;
ALTER TABLE citas ADD COLUMN IF NOT EXISTS recomendado_por TEXT DEFAULT NULL;
COMMENT ON COLUMN citas.origen_conocimiento IS 'Cómo se enteró de la plataforma: TikTok, Instagram, Facebook, Google, YouTube, Recomendación (solo primera cita, opcional).';
COMMENT ON COLUMN citas.recomendado_por IS 'Si origen_conocimiento = Recomendación, nombre de quien lo recomendó (opcional).';

-- ===== migrations/add_asistencia_sesion.sql =====
-- Migración: registrar cuándo paciente y psicólogo entran a la sala de video
-- para marcar la cita como "realizada" cuando ambos se unen.
-- Ejecutar: psql -U postgres -d psicologos_en_red_db -f migrations/add_asistencia_sesion.sql

ALTER TABLE citas
  ADD COLUMN IF NOT EXISTS paciente_entro_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS psicologo_entro_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN citas.paciente_entro_at IS 'Momento en que el paciente entró a la sala de video';
COMMENT ON COLUMN citas.psicologo_entro_at IS 'Momento en que el psicólogo entró a la sala de video';

-- ===== migrations/add_zoho_meeting_psicologos.sql =====
-- Enlaces de Zoho Meeting por psicólogo
-- zoho_join_link: para que el paciente entre a la reunión
-- zoho_start_link: para que el psicólogo inicie/entre como anfitrión
ALTER TABLE psicologos ADD COLUMN IF NOT EXISTS zoho_join_link TEXT;
ALTER TABLE psicologos ADD COLUMN IF NOT EXISTS zoho_start_link TEXT;

-- ===== migrations/update_lucy_zoho_meeting.sql =====
-- Actualiza la sala personal de Zoho Meeting de Lucy.
-- Ejecutar después de add_zoho_meeting_psicologos.sql
-- Si Lucy no se llama exactamente 'Lucy', cambia el WHERE o usa el id correcto.

UPDATE psicologos
SET zoho_join_link  = 'https://meet.zoho.com/fwnx-vuy-ufv',
    zoho_start_link = 'https://meet.zoho.com/fwnx-vuy-ufv'
WHERE nombre ILIKE '%lucy%';

-- Comprobar que se actualizó (debe devolver 1 fila con los enlaces):
-- SELECT id, nombre, zoho_join_link, zoho_start_link FROM psicologos WHERE nombre ILIKE '%lucy%';

-- ===== migrations/add_chat_notificacion_email.sql =====
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

-- ===== docs/recordatorio_post_cita.sql =====
-- Tabla para controlar envío de recordatorios "agendar de nuevo" a 15, 30 y 60 días desde la última cita realizada.
-- Ejecutar UNA sola vez en Railway → Query. Pega y ejecuta SOLO el siguiente bloque (una sola sentencia).

CREATE TABLE IF NOT EXISTS recordatorio_post_cita (
    id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    paciente_id INTEGER NOT NULL,
    cita_id INTEGER NOT NULL,
    enviado_dia_15_at DATE,
    enviado_dia_30_at DATE,
    enviado_dia_60_at DATE
);

-- Si ya creaste la tabla desde la UI de Railway, NO ejecutes lo de arriba. El error "recordatorio_post_cita_id_seq"
-- suele salir al usar SERIAL o al ejecutar varias sentencias juntas; con esta versión se evita.

-- ===== docs/agregar_motivo_consulta_citas.sql =====
-- Agregar columna motivo_de_consulta a la tabla citas
-- Ejecutar en tu base de datos (local o Railway) antes de usar el campo en el catálogo.

-- Si usas PostgreSQL (Railway, local):
ALTER TABLE citas
ADD COLUMN IF NOT EXISTS motivo_de_consulta VARCHAR(200);

COMMENT ON COLUMN citas.motivo_de_consulta IS 'Motivo de consulta elegido por el paciente (solo primera cita, terapia individual).';
