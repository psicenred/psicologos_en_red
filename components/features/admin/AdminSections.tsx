'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BlogImageUpload, RichTextEditor } from '@/components/features/admin/BlogEditor';
import {
  CarteraChart,
  diasSinCita,
  estadoBadgeClass,
  formatFecha,
  formatHora,
} from '@/components/features/admin/admin-helpers';
import { apiErrorMessage } from '@/lib/fetch-api';
import { updatePsicologoVisibilidadAction, saveAdminVideoConfigAction, updateAdminProfileAction } from '@/lib/admin/actions';
import type { AdminPanelInitialData } from '@/lib/admin/types';

const SERVER_BACKED_QUERY = {
  staleTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

type StatsPeriod = {
  pendiente?: number;
  confirmada?: number;
  realizada?: number;
  'no realizada'?: number;
  cancelada?: number;
  total?: number;
};

type Articulo = {
  id: number;
  titulo: string;
  slug: string;
  publicado: boolean;
  fecha_publicacion?: string;
  autor?: string;
};

type ArticuloFull = Articulo & {
  tiempo_lectura?: number;
  meta_title?: string;
  meta_description?: string;
  palabras_clave?: string;
  contenido_html?: string;
  extracto?: string;
  portada_url?: string;
};

function ResumenCitasTable({
  label,
  data,
  highlight,
}: {
  label: string;
  data?: StatsPeriod;
  highlight?: boolean;
}) {
  return (
    <tr style={highlight ? { background: '#f0f4ff' } : undefined}>
      <td style={{ fontWeight: highlight ? 700 : 600 }}>{label}</td>
      <td style={{ textAlign: 'center' }}>{data?.pendiente ?? 0}</td>
      <td style={{ textAlign: 'center' }}>{data?.confirmada ?? 0}</td>
      <td style={{ textAlign: 'center' }}>{data?.realizada ?? 0}</td>
      <td style={{ textAlign: 'center' }}>{data?.['no realizada'] ?? 0}</td>
      <td style={{ textAlign: 'center' }}>{data?.cancelada ?? 0}</td>
      <td
        style={{
          textAlign: 'center',
          fontWeight: 700,
          background: highlight ? '#e8f0fe' : '#f8f9fa',
        }}
      >
        {data?.total ?? 0}
      </td>
    </tr>
  );
}

async function fetchAdminList(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<Record<string, unknown>[]>;
}

export function AdminDashboardSection({
  initialData,
}: {
  initialData?: AdminPanelInitialData | null;
}) {
  const { data } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/estadisticas');
      return res.ok ? res.json() : null;
    },
    initialData: initialData?.stats,
    enabled: initialData?.stats === undefined,
    ...SERVER_BACKED_QUERY,
  });

  const { data: citas = [] } = useQuery({
    queryKey: ['admin-citas'],
    queryFn: async () => {
      const res = await fetch('/api/admin/citas');
      return res.ok ? res.json() : [];
    },
    initialData: initialData?.citas,
    enabled: initialData?.citas === undefined,
    ...SERVER_BACKED_QUERY,
  });

  const { data: cartera = [] } = useQuery({
    queryKey: ['admin-cartera'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cartera-psicologos');
      return res.ok ? res.json() : [];
    },
    initialData: initialData?.cartera,
    enabled: initialData?.cartera === undefined,
    ...SERVER_BACKED_QUERY,
  });

  if (!data) {
    return <p style={{ color: '#888' }}>Cargando estadísticas…</p>;
  }

  const countRol = (rol: string) => {
    const row = (data.usuarios || []).find(
      (u: { rol: string }) => String(u.rol).toLowerCase() === rol,
    );
    return row ? parseInt(String(row.total), 10) || 0 : 0;
  };

  return (
    <section id="dashboard" className="admin-section active">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon azul">👨‍⚕️</div>
          <div className="stat-info">
            <h3>{countRol('psicologo')}</h3>
            <p>Psicólogos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon rosa">👥</div>
          <div className="stat-info">
            <h3>{countRol('paciente')}</h3>
            <p>Pacientes</p>
          </div>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>📊 Resumen de Citas por Estado</h2>
        </div>
        <table style={{ marginTop: 15 }}>
          <thead>
            <tr>
              <th>Período</th>
              <th style={{ textAlign: 'center' }}>⏳ Pendiente</th>
              <th style={{ textAlign: 'center' }}>✅ Confirmada</th>
              <th style={{ textAlign: 'center' }}>🎯 Realizada</th>
              <th style={{ textAlign: 'center' }}>⏭️ No realizada</th>
              <th style={{ textAlign: 'center' }}>❌ Cancelada</th>
              <th style={{ textAlign: 'center' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <ResumenCitasTable label="📅 Hoy" data={data.hoy} />
            <ResumenCitasTable label="📆 Esta Semana" data={data.semana} />
            <ResumenCitasTable label="📊 Este Mes" data={data.mes} />
            <ResumenCitasTable label="🎯 Histórico" data={data.historico} highlight />
          </tbody>
        </table>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Últimas Citas</h2>
        </div>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Paciente</th>
              <th>Psicólogo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {citas.slice(0, 10).map((c: Record<string, unknown>) => (
              <tr key={String(c.id)}>
                <td>{formatFecha(String(c.fecha || ''))}</td>
                <td>{formatHora(String(c.hora || ''))}</td>
                <td>{String(c.paciente_nombre || '—')}</td>
                <td>{String(c.psicologo_nombre || '—')}</td>
                <td>
                  <span className={`badge ${estadoBadgeClass(String(c.estado || ''))}`}>
                    {String(c.estado || '—')}
                  </span>
                </td>
              </tr>
            ))}
            {citas.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center' }}>
                  Sin citas
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>📊 Cartera de Pacientes por Psicólogo</h2>
        </div>
        <div className="cartera-leyenda">
          <div className="cartera-leyenda-item">
            <span className="cartera-leyenda-color" style={{ background: '#27ae60' }} />
            Con cita agendada
          </div>
          <div className="cartera-leyenda-item">
            <span className="cartera-leyenda-color" style={{ background: '#f1c40f' }} />
            En seguimiento (&lt;15 días)
          </div>
          <div className="cartera-leyenda-item">
            <span className="cartera-leyenda-color" style={{ background: '#e74c3c' }} />
            En riesgo (&gt;30 días)
          </div>
        </div>
        <CarteraChart items={cartera} />
      </div>
    </section>
  );
}

export function AdminCitasSection({
  initialData,
}: {
  initialData?: AdminPanelInitialData | null;
}) {
  const { data: citas = [] } = useQuery({
    queryKey: ['admin-citas'],
    queryFn: async () => {
      const res = await fetch('/api/admin/citas');
      return res.ok ? res.json() : [];
    },
    initialData: initialData?.citas,
    enabled: initialData?.citas === undefined,
    ...SERVER_BACKED_QUERY,
  });

  const { data: psicologos = [] } = useQuery({
    queryKey: ['admin-psicologos'],
    queryFn: () => fetchAdminList('/api/admin/psicologos'),
    initialData: initialData?.psicologos,
    enabled: initialData?.psicologos === undefined,
    ...SERVER_BACKED_QUERY,
  });

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroPaciente, setFiltroPaciente] = useState('');
  const [filtroPsicologo, setFiltroPsicologo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const filtradas = useMemo(() => {
    return citas.filter((c: Record<string, unknown>) => {
      const fecha = String(c.fecha || '').slice(0, 10);
      if (fechaDesde && fecha < fechaDesde) return false;
      if (fechaHasta && fecha > fechaHasta) return false;
      if (filtroPaciente) {
        const q = filtroPaciente.toLowerCase();
        const nombre = String(c.paciente_nombre || '').toLowerCase();
        const email = String(c.paciente_email || '').toLowerCase();
        if (!nombre.includes(q) && !email.includes(q)) return false;
      }
      if (filtroPsicologo && String(c.psicologo_nombre || '') !== filtroPsicologo) return false;
      if (filtroEstado && String(c.estado || '').toLowerCase() !== filtroEstado) return false;
      return true;
    });
  }, [citas, fechaDesde, fechaHasta, filtroPaciente, filtroPsicologo, filtroEstado]);

  return (
    <section id="citas" className="admin-section active">
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Todas las Citas</h2>
        </div>

        <div className="filtros-citas">
          <div className="filtro-grupo">
            <label>Fecha Desde</label>
            <input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div className="filtro-grupo">
            <label>Fecha Hasta</label>
            <input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
          <div className="filtro-grupo">
            <label>Paciente</label>
            <input
              type="text"
              placeholder="Nombre o email..."
              value={filtroPaciente}
              onChange={(e) => setFiltroPaciente(e.target.value)}
              style={{ width: 180 }}
            />
          </div>
          <div className="filtro-grupo">
            <label>Psicólogo</label>
            <select value={filtroPsicologo} onChange={(e) => setFiltroPsicologo(e.target.value)}>
              <option value="">Todos</option>
              {psicologos.map((p: Record<string, unknown>) => (
                <option key={String(p.id)} value={String(p.nombre)}>
                  {String(p.nombre)}
                </option>
              ))}
            </select>
          </div>
          <div className="filtro-grupo">
            <label>Estado</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="realizada">Realizada</option>
              <option value="no realizada">No realizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div className="filtro-grupo">
            <button
              type="button"
              className="btn-limpiar-filtros"
              onClick={() => {
                setFechaDesde('');
                setFechaHasta('');
                setFiltroPaciente('');
                setFiltroPsicologo('');
                setFiltroEstado('');
              }}
            >
              Limpiar
            </button>
          </div>
        </div>

        <p style={{ marginBottom: 15, color: '#666', fontSize: '0.9rem' }}>
          Mostrando <strong>{filtradas.length}</strong> citas
        </p>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Paciente</th>
              <th>Email Paciente</th>
              <th>Psicólogo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((c: Record<string, unknown>) => (
              <tr key={String(c.id)}>
                <td>{String(c.id)}</td>
                <td>{formatFecha(String(c.fecha || ''))}</td>
                <td>{formatHora(String(c.hora || ''))}</td>
                <td>{String(c.paciente_nombre || '—')}</td>
                <td>{String(c.paciente_email || '—')}</td>
                <td>{String(c.psicologo_nombre || '—')}</td>
                <td>
                  <span className={`badge ${estadoBadgeClass(String(c.estado || ''))}`}>
                    {String(c.estado || '—')}
                  </span>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>
                  Sin resultados
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminPsicologosSection({
  initialData,
}: {
  initialData?: AdminPanelInitialData | null;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [visibilidadError, setVisibilidadError] = useState<string | null>(null);

  const {
    data: psicologos = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-psicologos'],
    queryFn: () => fetchAdminList('/api/admin/psicologos'),
    initialData: initialData?.psicologos,
    enabled: initialData?.psicologos === undefined,
    ...SERVER_BACKED_QUERY,
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return psicologos;
    return psicologos.filter((p: Record<string, unknown>) =>
      String(p.nombre || '')
        .toLowerCase()
        .includes(q),
    );
  }, [psicologos, busqueda]);

  async function toggleVisibilidad(
    id: number,
    campo: 'visible_mexico' | 'visible_internacional',
    valor: boolean,
  ) {
    const psi = psicologos.find((p: Record<string, unknown>) => Number(p.id) === id);
    if (!psi) return;
    const vm = campo === 'visible_mexico' ? !valor : Boolean(psi.visible_mexico);
    const vi =
      campo === 'visible_internacional' ? !valor : Boolean(psi.visible_internacional);

    setVisibilidadError(null);
    try {
      const result = await updatePsicologoVisibilidadAction(id, vm, vi);
      if (!result.ok) {
        setVisibilidadError(result.error);
        return;
      }

      qc.setQueryData(['admin-psicologos'], (old: Record<string, unknown>[] | undefined) =>
        (old ?? []).map((p) =>
          Number(p.id) === id
            ? {
                ...p,
                visible_mexico: result.data.visible_mexico,
                visible_internacional: result.data.visible_internacional,
              }
            : p,
        ),
      );
    } catch {
      setVisibilidadError('Error de conexión con el servidor.');
      return;
    }
    router.refresh();
  }

  return (
    <section id="psicologos" className="admin-section active">
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Psicólogos Registrados</h2>
          <div className="search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Buscar psicólogo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <p style={{ color: '#888' }}>Cargando psicólogos…</p>
        ) : isError ? (
          <p style={{ color: '#c0392b' }}>{apiErrorMessage(error)}</p>
        ) : null}
        {visibilidadError ? (
          <p style={{ color: '#c0392b', marginBottom: '0.75rem' }}>{visibilidadError}</p>
        ) : null}
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th title="Visible en catálogo para México (MXN)">🇲🇽 México</th>
              <th title="Visible en catálogo para internacional (USD)">🌎 Internacional</th>
              <th>Citas Hoy</th>
              <th>Total Citas</th>
              <th>Calificación</th>
              <th>Opiniones &lt;3⭐</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p: Record<string, unknown>) => (
              <tr key={String(p.id)}>
                <td>{String(p.id)}</td>
                <td>{String(p.nombre)}</td>
                <td>{String(p.email || '—')}</td>
                <td>{String(p.telefono || '—')}</td>
                <td>
                  <button
                    type="button"
                    className="vis-toggle"
                    onClick={() =>
                      toggleVisibilidad(Number(p.id), 'visible_mexico', !!p.visible_mexico)
                    }
                  >
                    {p.visible_mexico ? '✅' : '❌'}
                  </button>
                </td>
                <td>
                  <button
                    type="button"
                    className="vis-toggle"
                    onClick={() =>
                      toggleVisibilidad(
                        Number(p.id),
                        'visible_internacional',
                        !!p.visible_internacional,
                      )
                    }
                  >
                    {p.visible_internacional ? '✅' : '❌'}
                  </button>
                </td>
                <td>{String(p.citas_hoy ?? 0)}</td>
                <td>{String(p.total_citas ?? 0)}</td>
                <td>★ {String(p.calificacion ?? 0)}</td>
                <td>{String(p.opiniones_negativas ?? 0)}</td>
              </tr>
            ))}
            {filtrados.length === 0 && !isLoading && !isError ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center' }}>
                  Sin psicólogos
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminPacientesSection({
  initialData,
}: {
  initialData?: AdminPanelInitialData | null;
}) {
  const [busqueda, setBusqueda] = useState('');

  const {
    data: pacientes = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-pacientes'],
    queryFn: () => fetchAdminList('/api/admin/pacientes'),
    initialData: initialData?.pacientes,
    enabled: initialData?.pacientes === undefined,
    ...SERVER_BACKED_QUERY,
  });

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return pacientes;
    return pacientes.filter((p: Record<string, unknown>) => {
      const nombre = String(p.nombre || '').toLowerCase();
      const email = String(p.email || '').toLowerCase();
      return nombre.includes(q) || email.includes(q);
    });
  }, [pacientes, busqueda]);

  return (
    <section id="pacientes" className="admin-section active">
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Pacientes Registrados</h2>
          <div className="search-box">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>
        {isLoading ? (
          <p style={{ color: '#888' }}>Cargando pacientes…</p>
        ) : isError ? (
          <p style={{ color: '#c0392b' }}>{apiErrorMessage(error)}</p>
        ) : null}
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Contacto emergencia</th>
              <th>Total Citas</th>
              <th>Días sin cita</th>
              <th>Psicólogo</th>
              <th>Motivo consulta</th>
              <th>Acepta Promo</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p: Record<string, unknown>) => (
              <tr key={String(p.id)}>
                <td>{String(p.id)}</td>
                <td>{String(p.nombre)}</td>
                <td>{String(p.email || '—')}</td>
                <td>{String(p.telefono || '—')}</td>
                <td>{String(p.contacto_emergencia || '—')}</td>
                <td>{String(p.total_citas ?? 0)}</td>
                <td>
                  {diasSinCita(
                    String(p.ultima_cita || ''),
                    p.citas_futuras as string | number | null | undefined,
                  )}
                </td>
                <td>{String(p.psicologo || '—')}</td>
                <td>{String(p.motivo_consulta || '—')}</td>
                <td>{p.acepto_publicidad ? '✅' : '❌'}</td>
              </tr>
            ))}
            {filtrados.length === 0 && !isLoading && !isError ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center' }}>
                  Sin pacientes
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const emptyArticle = (): Partial<ArticuloFull> => ({
  titulo: '',
  slug: '',
  autor: 'Equipo Psicólogos en Red',
  tiempo_lectura: 5,
  contenido_html: '<p></p>',
  extracto: '',
  publicado: false,
  portada_url: '',
});

export function AdminBlogSection({
  initialData,
}: {
  initialData?: AdminPanelInitialData | null;
}) {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<Partial<ArticuloFull>>(emptyArticle());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const {
    data: articulos = [],
    isLoading: loadingArticulos,
    isError: articulosError,
    error: articulosLoadError,
  } = useQuery({
    queryKey: ['admin-blog'],
    queryFn: () => fetchAdminList('/api/admin/blog') as Promise<Articulo[]>,
    initialData: initialData?.blog as Articulo[] | undefined,
    enabled: initialData?.blog === undefined,
    ...SERVER_BACKED_QUERY,
  });

  useEffect(() => {
    if (editId && editId !== 'new') {
      fetch(`/api/admin/blog/${editId}`)
        .then((r) => r.json())
        .then(setForm)
        .catch(() => setError('No se pudo cargar el artículo'));
    }
  }, [editId]);

  function patch(fields: Partial<ArticuloFull>) {
    setForm((f) => ({ ...f, ...fields }));
  }

  async function guardar(publicado: boolean) {
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, publicado };
      const isNew = editId === 'new';
      const url = isNew ? '/api/admin/blog' : `/api/admin/blog/${editId}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al guardar');
        return;
      }
      qc.invalidateQueries({ queryKey: ['admin-blog'] });
      setEditId(data.id);
      setForm(data);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este artículo?')) return;
    await fetch(`/api/admin/blog/${id}`, { method: 'DELETE' });
    qc.invalidateQueries({ queryKey: ['admin-blog'] });
    setEditId(null);
    setForm(emptyArticle());
  }

  return (
    <section id="blog" className="admin-section active">
      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>📝 Gestor de Blog</h2>
        </div>
        <p style={{ margin: '0 0 14px', color: '#666', fontSize: '0.9rem' }}>
          Puedes usar formato enriquecido (negritas, listas, links e imágenes por URL). Guarda como
          borrador o publica.
        </p>

        <div className="blog-admin-form-grid">
          <div className="full">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Título</label>
            <input
              className="blog-admin-input"
              type="text"
              value={form.titulo || ''}
              onChange={(e) => patch({ titulo: e.target.value })}
              placeholder="Ej. Cómo construir relaciones sanas"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Slug</label>
            <input
              className="blog-admin-input"
              type="text"
              value={form.slug || ''}
              onChange={(e) => patch({ slug: e.target.value })}
              placeholder="como-construir-relaciones-sanas"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Autor</label>
            <input
              className="blog-admin-input"
              type="text"
              value={form.autor || ''}
              onChange={(e) => patch({ autor: e.target.value })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Tiempo de lectura (min)
            </label>
            <input
              className="blog-admin-input"
              type="number"
              min={1}
              value={form.tiempo_lectura || 5}
              onChange={(e) => patch({ tiempo_lectura: parseInt(e.target.value, 10) || 5 })}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Palabras clave
            </label>
            <input
              className="blog-admin-input"
              type="text"
              value={form.palabras_clave || ''}
              onChange={(e) => patch({ palabras_clave: e.target.value })}
            />
          </div>
          <div className="full">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>Extracto</label>
            <textarea
              className="blog-admin-textarea"
              value={form.extracto || ''}
              onChange={(e) => patch({ extracto: e.target.value })}
            />
          </div>
          <div className="full">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              URL portada
            </label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="blog-admin-input"
                type="text"
                value={form.portada_url || ''}
                onChange={(e) => patch({ portada_url: e.target.value })}
              />
              <BlogImageUpload onUploaded={(url) => patch({ portada_url: url })} />
            </div>
          </div>
          <div className="full">
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
              Contenido del artículo
            </label>
            <RichTextEditor
              content={form.contenido_html || ''}
              onChange={(html) => patch({ contenido_html: html })}
            />
          </div>
        </div>

        {error ? <p style={{ color: '#c0392b', fontSize: '0.9rem' }}>{error}</p> : null}

        <div className="blog-admin-actions">
          <button
            type="button"
            className="blog-admin-btn secondary"
            onClick={() => {
              setEditId('new');
              setForm(emptyArticle());
            }}
          >
            + Nuevo artículo
          </button>
          <button
            type="button"
            className="blog-admin-btn primary"
            disabled={saving}
            onClick={() => guardar(false)}
          >
            {saving ? 'Guardando…' : '💾 Guardar borrador'}
          </button>
          <button
            type="button"
            className="blog-admin-btn primary"
            disabled={saving}
            onClick={() => guardar(true)}
          >
            {saving ? 'Publicando…' : '🚀 Publicar'}
          </button>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Artículos guardados</h2>
        </div>
        {loadingArticulos ? (
          <p style={{ color: '#888' }}>Cargando artículos…</p>
        ) : articulosError ? (
          <p style={{ color: '#c0392b' }}>{apiErrorMessage(articulosLoadError)}</p>
        ) : null}
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Slug</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Autor</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {articulos.map((a: Articulo) => (
              <tr key={a.id}>
                <td>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primario-rosa)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      padding: 0,
                    }}
                    onClick={() => setEditId(a.id)}
                  >
                    {a.titulo}
                  </button>
                </td>
                <td>{a.slug}</td>
                <td>{a.publicado ? '✅ Publicado' : '📝 Borrador'}</td>
                <td>{formatFecha(a.fecha_publicacion)}</td>
                <td>{a.autor || '—'}</td>
                <td>
                  <button
                    type="button"
                    className="blog-admin-btn danger"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    onClick={() => eliminar(a.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {articulos.length === 0 && !loadingArticulos && !articulosError ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center' }}>
                  Sin artículos
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function AdminConfigSection({
  initialData,
}: {
  initialData?: AdminPanelInitialData | null;
}) {
  const profile = initialData?.config?.profile;
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(profile?.nombre ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [telefono, setTelefono] = useState(profile?.telefono ?? '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [video15, setVideo15] = useState(initialData?.config?.video_boton_15min ?? true);
  const [videoMsg, setVideoMsg] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileMsg('');
    try {
      const result = await updateAdminProfileAction({
        nombre,
        telefono,
        password: password || undefined,
      });
      if (result.ok) {
        setProfileMsg('✅ Perfil actualizado');
        setEditing(false);
        setPassword('');
      } else {
        setProfileMsg(`❌ ${result.error}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function guardarVideoConfig() {
    setVideoMsg('');
    const result = await saveAdminVideoConfigAction(video15);
    setVideoMsg(
      result.ok ? '✅ Configuración guardada' : `❌ ${result.error}`,
    );
  }

  return (
    <section id="configuracion" className="admin-section active">
      <div className="admin-table-container" style={{ maxWidth: 600 }}>
        <div className="admin-table-header">
          <h2>👤 Mi Perfil</h2>
          {!editing ? (
            <button type="button" className="btn-editar-admin" onClick={() => setEditing(true)}>
              ✏️ Editar
            </button>
          ) : null}
        </div>

        <form className="admin-config-form" onSubmit={guardarPerfil} style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
              Nombre Completo
            </label>
            <input
              type="text"
              readOnly={!editing}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                border: '2px solid #eee',
                borderRadius: 10,
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              disabled
              readOnly
              value={email}
              style={{
                width: '100%',
                padding: 12,
                border: '2px solid #eee',
                borderRadius: 10,
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
            <small style={{ color: '#888', fontSize: '0.8rem' }}>El correo no se puede modificar</small>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
              Teléfono
            </label>
            <input
              type="tel"
              readOnly={!editing}
              placeholder="No registrado"
              value={telefono || ''}
              onChange={(e) => setTelefono(e.target.value)}
              style={{
                width: '100%',
                padding: 12,
                border: '2px solid #eee',
                borderRadius: 10,
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {editing ? (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#333' }}>
                Nueva Contraseña
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Dejar vacío para no cambiar"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    paddingRight: 50,
                    border: '2px solid #eee',
                    borderRadius: 10,
                    fontSize: '1rem',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                  }}
                >
                  👁️
                </button>
              </div>
            </div>
          ) : null}

          <hr style={{ margin: '25px 0', border: 0, borderTop: '1px solid #eee' }} />
          <h3 style={{ marginBottom: 12, color: '#333' }}>🎥 Videollamadas</h3>
          <div
            style={{
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <input
                type="checkbox"
                checked={video15}
                onChange={(e) => setVideo15(e.target.checked)}
              />
              <span>Activar botón de video solo 15 minutos antes de la cita</span>
            </label>
            <button
              type="button"
              onClick={guardarVideoConfig}
              style={{
                padding: '8px 16px',
                background: 'var(--primario-rosa, #ED87AF)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Guardar
            </button>
            {videoMsg ? (
              <span style={{ fontSize: '0.85rem', color: '#666' }}>{videoMsg}</span>
            ) : null}
          </div>
          <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#666' }}>
            Si está desactivado, paciente y psicólogo podrán unirse a la videollamada en cualquier
            momento para citas futuras.
          </p>

          {profileMsg ? (
            <p style={{ fontSize: '0.9rem', marginBottom: 12 }}>{profileMsg}</p>
          ) : null}

          {editing ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 25 }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #11998e, #38ef7d)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {saving ? 'Guardando…' : '💾 Guardar Cambios'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setPassword('');
                  setProfileMsg('');
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                ✖️ Cancelar
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}
