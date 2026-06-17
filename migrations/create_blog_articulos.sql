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
