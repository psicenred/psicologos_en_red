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
