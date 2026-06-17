-- Contacto de emergencia para pacientes (perfil → Configuración)
-- Ejecutar una vez en tu base de datos (local y Railway).

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS contacto_emergencia text NULL;

COMMENT ON COLUMN usuarios.contacto_emergencia IS 'Nombre y/o teléfono de contacto en caso de emergencia (editable en perfil).';
