-- Admin academia — ejecutar DESPUÉS de add_course_admin_profiles.sql
--
-- 1. Supabase Dashboard → Authentication → Users → Add user
--    Email: contacto.academia@psicologosenred.com
--    Password: (elige una segura; compártela solo al equipo academia)
--    Auto Confirm User: sí
--
-- 2. Ejecuta este script:

INSERT INTO course_admin_profiles (id, full_name)
SELECT id, 'Academia Psicologos en Red'
FROM auth.users
WHERE lower(email) = lower('contacto.academia@psicologosenred.com')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Verificar:
SELECT p.id, p.full_name, u.email
FROM course_admin_profiles p
JOIN auth.users u ON u.id = p.id
WHERE lower(u.email) = lower('contacto.academia@psicologosenred.com');
