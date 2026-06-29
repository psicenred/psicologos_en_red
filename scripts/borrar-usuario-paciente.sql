-- Borra un paciente y sus datos para poder volver a registrarse con el mismo correo.
-- Ejecutar en Supabase → SQL Editor (una sola vez por correo).
-- Cambia el email en la línea marcada ↓

BEGIN;

DO $$
DECLARE
  uid INTEGER;
  target_email TEXT := 'ivonn99.dmh@gmail.com';  -- ← cambia aquí si necesitas otro correo
BEGIN
  SELECT id INTO uid FROM usuarios WHERE LOWER(email) = LOWER(target_email) LIMIT 1;

  IF uid IS NULL THEN
    RAISE NOTICE 'No existe usuario con email: %', target_email;
    RETURN;
  END IF;

  RAISE NOTICE 'Borrando usuario id=% email=%', uid, target_email;

  -- Referidos (si migración add_programa_referidos.sql está aplicada)
  DELETE FROM referidos WHERE referido_user_id = uid;

  -- Chat / notificaciones
  DELETE FROM chat_notificacion_email
  WHERE destinatario_id = uid OR remitente_id = uid;
  DELETE FROM mensajes
  WHERE remitente_id = uid OR destinatario_id = uid;

  -- Opiniones, encuestas, recordatorios post-cita
  DELETE FROM opiniones WHERE paciente_id = uid;
  DELETE FROM encuestas_satisfaccion WHERE usuario_id = uid;
  DELETE FROM recordatorio_post_cita WHERE paciente_id = uid;

  -- Citas del paciente
  DELETE FROM citas WHERE paciente_id = uid;

  -- Usuario
  DELETE FROM usuarios WHERE id = uid;

  RAISE NOTICE 'Listo. Ya puedes registrarte de nuevo con %', target_email;
END $$;

COMMIT;

-- Verificación (debe devolver 0 filas):
-- SELECT id, email FROM usuarios WHERE LOWER(email) = LOWER('ivonn99.dmh@gmail.com');
