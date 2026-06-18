import { query } from '@/lib/db';
import { isUndefinedColumn } from '@/lib/admin/db-errors';

const PSICOLOGOS_FULL_SQL = `
  SELECT p.id, p.nombre, p.especialidad, COALESCE(u.email, p.email) AS email, u.telefono, p.usuario_id,
         COALESCE(p.visible_mexico, true) AS visible_mexico,
         COALESCE(p.visible_internacional, false) AS visible_internacional,
         (SELECT COUNT(*)::int FROM citas WHERE psicologo_id = p.id) AS total_citas,
         (SELECT COUNT(*)::int FROM citas WHERE psicologo_id = p.id AND fecha = CURRENT_DATE) AS citas_hoy,
         COALESCE(p.rating, 0) AS calificacion,
         (SELECT COUNT(*)::int FROM opiniones WHERE psicologo_id = p.id) AS total_opiniones,
         (SELECT COUNT(*)::int FROM opiniones WHERE psicologo_id = p.id AND estrellas < 3) AS opiniones_negativas
  FROM psicologos p
  LEFT JOIN usuarios u ON p.usuario_id = u.id
  ORDER BY p.nombre
`;

const PSICOLOGOS_BASE_SQL = `
  SELECT p.id, p.nombre, p.especialidad, COALESCE(u.email, p.email) AS email, u.telefono, p.usuario_id,
         true AS visible_mexico,
         false AS visible_internacional,
         (SELECT COUNT(*)::int FROM citas WHERE psicologo_id = p.id) AS total_citas,
         (SELECT COUNT(*)::int FROM citas WHERE psicologo_id = p.id AND fecha = CURRENT_DATE) AS citas_hoy,
         COALESCE(p.rating, 0) AS calificacion,
         0 AS total_opiniones,
         0 AS opiniones_negativas
  FROM psicologos p
  LEFT JOIN usuarios u ON p.usuario_id = u.id
  ORDER BY p.nombre
`;

const PACIENTES_FULL_SQL = `
  SELECT u.id, u.nombre, u.email, u.telefono, u.contacto_emergencia, u.acepto_publicidad,
         (SELECT COUNT(*)::int FROM citas WHERE paciente_id = u.id) AS total_citas,
         (SELECT MAX(fecha) FROM citas WHERE paciente_id = u.id AND fecha < CURRENT_DATE) AS ultima_cita,
         (SELECT COUNT(*)::int FROM citas WHERE paciente_id = u.id AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')) AS citas_futuras,
         (SELECT p.nombre FROM citas c JOIN psicologos p ON p.id = c.psicologo_id WHERE c.paciente_id = u.id ORDER BY c.fecha DESC, c.hora DESC NULLS LAST LIMIT 1) AS psicologo,
         (SELECT c.motivo_de_consulta FROM citas c WHERE c.paciente_id = u.id ORDER BY c.fecha DESC, c.hora DESC NULLS LAST LIMIT 1) AS motivo_consulta
  FROM usuarios u
  WHERE LOWER(TRIM(u.rol)) = 'paciente'
  ORDER BY u.nombre
  LIMIT 200
`;

const PACIENTES_BASE_SQL = `
  SELECT u.id, u.nombre, u.email, u.telefono, NULL::text AS contacto_emergencia, u.acepto_publicidad,
         (SELECT COUNT(*)::int FROM citas WHERE paciente_id = u.id) AS total_citas,
         (SELECT MAX(fecha) FROM citas WHERE paciente_id = u.id AND fecha < CURRENT_DATE) AS ultima_cita,
         (SELECT COUNT(*)::int FROM citas WHERE paciente_id = u.id AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')) AS citas_futuras,
         (SELECT p.nombre FROM citas c JOIN psicologos p ON p.id = c.psicologo_id WHERE c.paciente_id = u.id ORDER BY c.fecha DESC, c.hora DESC NULLS LAST LIMIT 1) AS psicologo,
         NULL::varchar AS motivo_consulta
  FROM usuarios u
  WHERE LOWER(TRIM(u.rol)) = 'paciente'
  ORDER BY u.nombre
  LIMIT 200
`;

export async function listAdminPsicologos() {
  try {
    const result = await query(PSICOLOGOS_FULL_SQL);
    return result.rows;
  } catch (error) {
    if (!isUndefinedColumn(error)) throw error;
    const result = await query(PSICOLOGOS_BASE_SQL);
    return result.rows;
  }
}

export async function listAdminPacientes() {
  try {
    const result = await query(PACIENTES_FULL_SQL);
    return result.rows;
  } catch (error) {
    if (!isUndefinedColumn(error)) throw error;
    const result = await query(PACIENTES_BASE_SQL);
    return result.rows;
  }
}

const BLOG_LIST_SQL = `
  SELECT id, titulo, slug, autor, tiempo_lectura, meta_title, meta_description,
         palabras_clave, extracto, portada_url, publicado, fecha_publicacion, created_at, updated_at
  FROM blog_articulos
  ORDER BY fecha_publicacion DESC, id DESC
`;

const BLOG_LIST_BASE_SQL = `
  SELECT id, titulo, slug, autor, tiempo_lectura,
         NULL::varchar AS meta_title, NULL::varchar AS meta_description,
         '{}'::text[] AS palabras_clave, extracto, portada_url, publicado, fecha_publicacion,
         fecha_publicacion AS created_at, fecha_publicacion AS updated_at
  FROM blog_articulos
  ORDER BY fecha_publicacion DESC, id DESC
`;

export async function listAdminBlogArticles() {
  try {
    const result = await query(BLOG_LIST_SQL);
    return result.rows;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === '42P01') {
      throw new Error('La tabla blog_articulos no existe. Ejecuta la migración create_blog_articulos.sql.');
    }
    if (!isUndefinedColumn(error)) throw error;
    const result = await query(BLOG_LIST_BASE_SQL);
    return result.rows;
  }
}
