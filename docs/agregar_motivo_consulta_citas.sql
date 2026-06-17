-- Agregar columna motivo_de_consulta a la tabla citas
-- Ejecutar en tu base de datos (local o Railway) antes de usar el campo en el catálogo.

-- Si usas PostgreSQL (Railway, local):
ALTER TABLE citas
ADD COLUMN IF NOT EXISTS motivo_de_consulta VARCHAR(200);

COMMENT ON COLUMN citas.motivo_de_consulta IS 'Motivo de consulta elegido por el paciente (solo primera cita, terapia individual).';
