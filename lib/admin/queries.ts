import { isUndefinedColumn } from '@/lib/admin/db-errors';
import { marcarCitasNoRealizadas } from '@/lib/citas/no-show';
import { query } from '@/lib/db';

export type AdminCitasStats = {
  pendiente: number;
  confirmada: number;
  realizada: number;
  cancelada: number;
  'no realizada': number;
  total: number;
};

export type AdminEstadisticas = {
  usuarios: { rol: string; total: string }[];
  hoy: AdminCitasStats;
  semana: AdminCitasStats;
  mes: AdminCitasStats;
  historico: AdminCitasStats;
};

export type AdminCarteraItem = {
  id: number;
  nombre: string;
  con_cita: number;
  en_seguimiento: number;
  en_riesgo: number;
};

function citasEstadoToStats(rows: { estado: string; total: string }[]): AdminCitasStats {
  const obj: AdminCitasStats = {
    pendiente: 0,
    confirmada: 0,
    realizada: 0,
    cancelada: 0,
    'no realizada': 0,
    total: 0,
  };
  rows.forEach((r) => {
    const bucket = obj as Record<string, number>;
    bucket[r.estado] = parseInt(r.total, 10) || 0;
    obj.total += parseInt(r.total, 10) || 0;
  });
  return obj;
}

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

export async function loadAdminEstadisticas(): Promise<AdminEstadisticas> {
  const usuarios = await query(`SELECT rol, COUNT(*) as total FROM usuarios GROUP BY rol`);
  const citasHoy = await query(`
    SELECT COALESCE(estado, 'pendiente') as estado, COUNT(*) as total
    FROM citas WHERE fecha = CURRENT_DATE GROUP BY estado
  `);
  const citasSemana = await query(`
    SELECT COALESCE(estado, 'pendiente') as estado, COUNT(*) as total
    FROM citas WHERE fecha >= CURRENT_DATE - INTERVAL '7 days' GROUP BY estado
  `);
  const citasMes = await query(`
    SELECT COALESCE(estado, 'pendiente') as estado, COUNT(*) as total
    FROM citas WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE) GROUP BY estado
  `);
  const citasTotal = await query(`
    SELECT COALESCE(estado, 'pendiente') as estado, COUNT(*) as total
    FROM citas GROUP BY estado
  `);

  return {
    usuarios: usuarios.rows as { rol: string; total: string }[],
    hoy: citasEstadoToStats(citasHoy.rows as { estado: string; total: string }[]),
    semana: citasEstadoToStats(citasSemana.rows as { estado: string; total: string }[]),
    mes: citasEstadoToStats(citasMes.rows as { estado: string; total: string }[]),
    historico: citasEstadoToStats(citasTotal.rows as { estado: string; total: string }[]),
  };
}

export async function listAdminCitas() {
  await marcarCitasNoRealizadas();
  const result = await query(`
    SELECT c.id, c.fecha, c.hora, c.estado,
           pac.nombre as paciente_nombre, pac.email as paciente_email,
           psi.nombre as psicologo_nombre
    FROM citas c
    JOIN usuarios pac ON c.paciente_id = pac.id
    JOIN psicologos psi ON c.psicologo_id = psi.id
    ORDER BY c.fecha DESC, c.hora DESC
    LIMIT 100
  `);
  return result.rows;
}

export async function listAdminCartera(): Promise<AdminCarteraItem[]> {
  const psicologos = await query('SELECT id, nombre FROM psicologos ORDER BY nombre');
  const resultado: AdminCarteraItem[] = [];

  for (const psi of psicologos.rows as { id: number; nombre: string }[]) {
    const conCita = await query(
      `SELECT COUNT(DISTINCT paciente_id) as total
       FROM citas
       WHERE psicologo_id = $1 AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')`,
      [psi.id],
    );
    const enSeguimiento = await query(
      `SELECT COUNT(*) as total FROM (
         SELECT paciente_id, MAX(fecha) as ultima
         FROM citas WHERE psicologo_id = $1 AND fecha < CURRENT_DATE
         GROUP BY paciente_id
         HAVING MAX(fecha) >= CURRENT_DATE - INTERVAL '15 days'
       ) sub
       WHERE paciente_id NOT IN (
         SELECT DISTINCT paciente_id FROM citas
         WHERE psicologo_id = $1 AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')
       )`,
      [psi.id],
    );
    const enRiesgo = await query(
      `SELECT COUNT(*) as total FROM (
         SELECT paciente_id, MAX(fecha) as ultima
         FROM citas WHERE psicologo_id = $1
         GROUP BY paciente_id
         HAVING MAX(fecha) < CURRENT_DATE - INTERVAL '30 days'
       ) sub
       WHERE paciente_id NOT IN (
         SELECT DISTINCT paciente_id FROM citas
         WHERE psicologo_id = $1 AND fecha >= CURRENT_DATE AND estado NOT IN ('cancelada')
       )`,
      [psi.id],
    );

    resultado.push({
      id: psi.id,
      nombre: psi.nombre,
      con_cita: parseInt(String(conCita.rows[0]?.total), 10) || 0,
      en_seguimiento: parseInt(String(enSeguimiento.rows[0]?.total), 10) || 0,
      en_riesgo: parseInt(String(enRiesgo.rows[0]?.total), 10) || 0,
    });
  }

  return resultado;
}

export async function loadAdminPlatformConfig(): Promise<{ video_boton_15min: boolean }> {
  try {
    const r = await query(
      "SELECT valor FROM config_plataforma WHERE clave = 'video_boton_15min' LIMIT 1",
    );
    const val = (r.rows[0] as { valor?: string } | undefined)?.valor;
    return { video_boton_15min: val !== 'false' && val !== '0' };
  } catch {
    return { video_boton_15min: true };
  }
}

export async function saveAdminVideoBoton15Min(activar15Min: boolean) {
  await query(
    `INSERT INTO config_plataforma (clave, valor) VALUES ('video_boton_15min', $1)
     ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
    [activar15Min ? 'true' : 'false'],
  );
  return { video_boton_15min: activar15Min };
}

export async function loadUsuarioTelefono(usuarioId: number): Promise<string> {
  const result = await query('SELECT telefono FROM usuarios WHERE id = $1', [usuarioId]);
  return String((result.rows[0] as { telefono?: string } | undefined)?.telefono ?? '');
}

export async function updateAdminPsicologoVisibilidad(
  id: number,
  visibleMexico: boolean,
  visibleInternacional: boolean,
) {
  try {
    const result = await query(
      `UPDATE psicologos
       SET visible_mexico = $1, visible_internacional = $2
       WHERE id = $3
       RETURNING id, visible_mexico, visible_internacional`,
      [visibleMexico, visibleInternacional, id],
    );
    return result.rows[0] as
      | { id: number; visible_mexico: boolean; visible_internacional: boolean }
      | undefined;
  } catch (error) {
    if (isUndefinedColumn(error)) {
      throw new Error('missing_visibility_columns');
    }
    throw error;
  }
}

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
