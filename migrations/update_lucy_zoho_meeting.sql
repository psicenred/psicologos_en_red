-- Actualiza la sala personal de Zoho Meeting de Lucy.
-- Ejecutar después de add_zoho_meeting_psicologos.sql
-- Si Lucy no se llama exactamente 'Lucy', cambia el WHERE o usa el id correcto.

UPDATE psicologos
SET zoho_join_link  = 'https://meet.zoho.com/fwnx-vuy-ufv',
    zoho_start_link = 'https://meet.zoho.com/fwnx-vuy-ufv'
WHERE nombre ILIKE '%lucy%';

-- Comprobar que se actualizó (debe devolver 1 fila con los enlaces):
-- SELECT id, nombre, zoho_join_link, zoho_start_link FROM psicologos WHERE nombre ILIKE '%lucy%';
