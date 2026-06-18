'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { nombreDia } from './doctor-helpers';

const DIAS_OPCIONES = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const ZONAS = [
  { value: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { value: 'America/Tijuana', label: 'Tijuana (GMT-8)' },
  { value: 'America/Hermosillo', label: 'Hermosillo (GMT-7)' },
  { value: 'America/Monterrey', label: 'Monterrey (GMT-6)' },
  { value: 'America/New_York', label: 'Nueva York / Este (GMT-5)' },
  { value: 'America/Chicago', label: 'Chicago / Centro (GMT-6)' },
  { value: 'America/Denver', label: 'Denver / Montaña (GMT-7)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles / Pacífico (GMT-8)' },
  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { value: 'America/Lima', label: 'Lima (GMT-5)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { value: 'Europe/Madrid', label: 'Madrid / España (GMT+1)' },
];

export function DoctorAgendaSection() {
  const qc = useQueryClient();
  const [dia, setDia] = useState(1);
  const [inicio, setInicio] = useState('09:00');
  const [fin, setFin] = useState('13:00');
  const [vacInicio, setVacInicio] = useState('');
  const [vacFin, setVacFin] = useState('');
  const [vacMotivo, setVacMotivo] = useState('');
  const [zona, setZona] = useState('America/Mexico_City');
  const [zonaMsg, setZonaMsg] = useState('');
  const [editando, setEditando] = useState(false);
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['user-data'],
    queryFn: async () => {
      const res = await fetch('/api/user-data');
      return res.ok ? res.json() : null;
    },
  });

  const { data: bloques = [] } = useQuery({
    queryKey: ['horario-laboral'],
    queryFn: async () => {
      const res = await fetch('/api/horario-laboral');
      return res.ok ? res.json() : [];
    },
  });

  const { data: vacaciones = [] } = useQuery({
    queryKey: ['vacaciones'],
    queryFn: async () => {
      const res = await fetch('/api/vacaciones');
      return res.ok ? res.json() : [];
    },
  });

  useEffect(() => {
    fetch('/api/mi-zona-horaria')
      .then((r) => r.json())
      .then((d) => {
        if (d.zona_horaria) setZona(d.zona_horaria);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (user?.telefono) setTelefono(user.telefono);
  }, [user?.telefono]);

  type Bloque = { id: number; dia_semana: number; hora_inicio: string; hora_fin: string };

  const bloquesPorDia = useMemo(() => {
    const map = new Map<number, Bloque[]>();
    for (const b of bloques as Bloque[]) {
      const list = map.get(b.dia_semana) || [];
      list.push(b);
      map.set(b.dia_semana, list);
    }
    return map;
  }, [bloques]);

  async function agregarHorario(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/horario-laboral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dia_semana: dia, hora_inicio: inicio, hora_fin: fin }),
    });
    qc.invalidateQueries({ queryKey: ['horario-laboral'] });
  }

  async function eliminarHorario(id: number) {
    await fetch(`/api/horario-laboral/${id}`, { method: 'DELETE' });
    qc.invalidateQueries({ queryKey: ['horario-laboral'] });
  }

  async function agregarVacaciones(e: React.FormEvent) {
    e.preventDefault();
    if (!vacInicio) return;
    await fetch('/api/vacaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha_inicio: vacInicio,
        fecha_fin: vacFin || vacInicio,
        motivo: vacMotivo,
      }),
    });
    setVacInicio('');
    setVacFin('');
    setVacMotivo('');
    qc.invalidateQueries({ queryKey: ['vacaciones'] });
  }

  async function eliminarVacacion(id: number) {
    await fetch(`/api/vacaciones/${id}`, { method: 'DELETE' });
    qc.invalidateQueries({ queryKey: ['vacaciones'] });
  }

  async function guardarZona() {
    await fetch('/api/mi-zona-horaria', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona_horaria: zona }),
    });
    setZonaMsg('Zona horaria guardada.');
    setTimeout(() => setZonaMsg(''), 3000);
  }

  async function detectarZona() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) setZona(tz);
    await fetch('/api/mi-zona-horaria/detectar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zona_horaria: tz }),
    });
    setZonaMsg('Zona detectada y guardada.');
    setTimeout(() => setZonaMsg(''), 3000);
  }

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono, password: password || undefined }),
    });
    setEditando(false);
    setPassword('');
    qc.invalidateQueries({ queryKey: ['user-data'] });
    alert('Perfil actualizado');
  }

  return (
    <div className="seccion-panel">
      <div className="agenda-container">
        <div className="agenda-header">
          <h2>🗓️ Configuración de Agenda</h2>
          <p>Define tu horario laboral semanal y registra vacaciones/bloqueos de fechas.</p>
        </div>

        <div className="dash-card agenda-card-responsive" style={{ marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>🌍 Zona horaria</h3>
          <p style={{ margin: '0 0 8px', color: '#666', fontSize: '0.95rem' }}>
            Se actualiza al entrar o al pulsar «Detectar automáticamente».
          </p>
          <p style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>
            <strong>Tu zona horaria actual:</strong>{' '}
            <span style={{ color: 'var(--primario-rosa)' }}>{zona}</span>
          </p>
          <div className="form-horario-simple">
            <div className="form-row" style={{ alignItems: 'center' }}>
              <div className="form-group" style={{ maxWidth: 320 }}>
                <label htmlFor="zona-horaria-doc">Cambiar zona horaria</label>
                <select
                  id="zona-horaria-doc"
                  value={zona}
                  onChange={(e) => setZona(e.target.value)}
                >
                  {ZONAS.map((z) => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>
              <button type="button" className="btn-cita-secundario" onClick={guardarZona}>
                Guardar zona
              </button>
              <button type="button" className="btn-cita-secundario" onClick={detectarZona}>
                Detectar automáticamente
              </button>
            </div>
          </div>
          {zonaMsg ? (
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'green' }}>{zonaMsg}</p>
          ) : null}
        </div>

        <div className="dash-card agenda-card-responsive">
          <h3 style={{ marginTop: 0 }}>🕒 Horario de trabajo</h3>
          <p style={{ margin: '0 0 16px', color: '#666', fontSize: '0.95rem' }}>
            Agrega los bloques de tiempo en los que atiendes.
          </p>
          <form className="form-horario-simple" onSubmit={agregarHorario}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="hl-dia">Día</label>
                <select id="hl-dia" value={dia} onChange={(e) => setDia(Number(e.target.value))}>
                  {DIAS_OPCIONES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="hl-inicio">Desde</label>
                <input
                  id="hl-inicio"
                  type="time"
                  value={inicio}
                  step={3600}
                  onChange={(e) => setInicio(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="hl-fin">Hasta</label>
                <input
                  id="hl-fin"
                  type="time"
                  value={fin}
                  step={3600}
                  onChange={(e) => setFin(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-agregar-bloque">
                + Agregar
              </button>
            </div>
          </form>
          <div style={{ marginTop: 20 }}>
            {bloquesPorDia.size === 0 ? (
              <p className="texto-vacio">Sin bloques configurados.</p>
            ) : (
              [1, 2, 3, 4, 5, 6, 0].map((d) => {
                const items = bloquesPorDia.get(d);
                if (!items?.length) return null;
                return (
                  <div key={d} className="horario-dia">
                    <div className="horario-dia__nombre">{nombreDia(d)}</div>
                    <div className="horario-dia__bloques">
                      {items.map((b) => (
                        <span key={b.id} className="bloque-horario">
                          {String(b.hora_inicio).slice(0, 5)} – {String(b.hora_fin).slice(0, 5)}
                          <button
                            type="button"
                            className="btn-quitar"
                            onClick={() => eliminarHorario(b.id)}
                            aria-label="Quitar"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="dash-card agenda-card-responsive" style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>🏖️ Vacaciones / Bloqueos</h3>
          <form className="form-horario-simple" onSubmit={agregarVacaciones}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vac-inicio">Desde</label>
                <input
                  id="vac-inicio"
                  type="date"
                  required
                  value={vacInicio}
                  onChange={(e) => setVacInicio(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="vac-fin">Hasta (opcional)</label>
                <input
                  id="vac-fin"
                  type="date"
                  value={vacFin}
                  onChange={(e) => setVacFin(e.target.value)}
                />
              </div>
              <div className="form-group form-group-motivo">
                <label htmlFor="vac-motivo">Motivo (opcional)</label>
                <input
                  id="vac-motivo"
                  type="text"
                  placeholder="Ej: Vacaciones, Congreso..."
                  value={vacMotivo}
                  onChange={(e) => setVacMotivo(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-agregar-bloque btn-bloquear">
                Bloquear
              </button>
            </div>
          </form>
          <div style={{ marginTop: 20 }}>
            {(vacaciones as { id: number; fecha_inicio: string; fecha_fin: string; motivo?: string }[]).length === 0 ? (
              <p className="texto-vacio">Sin bloqueos registrados.</p>
            ) : (
              (vacaciones as { id: number; fecha_inicio: string; fecha_fin: string; motivo?: string }[]).map((v) => (
                <div key={v.id} className="bloqueo-item">
                  <div className="bloqueo-info">
                    <span className="bloqueo-fechas">
                      {String(v.fecha_inicio).slice(0, 10)} →{' '}
                      {String(v.fecha_fin || v.fecha_inicio).slice(0, 10)}
                    </span>
                    {v.motivo ? <span className="bloqueo-motivo">· {v.motivo}</span> : null}
                  </div>
                  <button
                    type="button"
                    className="btn-quitar"
                    onClick={() => eliminarVacacion(v.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dash-card agenda-card-responsive" style={{ marginTop: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: 0 }}>👤 Mi Perfil</h3>
            {!editando ? (
              <button type="button" className="btn-editar-v2" onClick={() => setEditando(true)}>
                Editar Perfil
              </button>
            ) : null}
          </div>
          <form className="form-perfil-doctor" onSubmit={guardarPerfil}>
            <div className="form-group-perfil">
              <label>Nombre (no modificable)</label>
              <input
                type="text"
                value={user?.nombre || ''}
                readOnly
                disabled
                className="input-readonly-doc"
              />
            </div>
            <div className="form-group-perfil">
              <label>Correo electrónico (no modificable)</label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                disabled
                className="input-readonly-doc"
              />
            </div>
            <div className="form-group-perfil">
              <label>Teléfono</label>
              <input
                type="tel"
                value={telefono}
                readOnly={!editando}
                className={editando ? 'input-editable-doc' : 'input-readonly-doc'}
                placeholder="No registrado"
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
            <div className="form-group-perfil">
              <label>Contraseña</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={editando ? password : '********'}
                  readOnly={!editando}
                  className={editando ? 'input-editable-doc' : 'input-readonly-doc'}
                  placeholder="Escribe nueva contraseña para cambiar"
                  onChange={(e) => setPassword(e.target.value)}
                />
                {editando ? (
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    👁️
                  </button>
                ) : null}
              </div>
            </div>
            {editando ? (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button type="submit" className="btn-agregar-bloque">
                  Guardar Cambios
                </button>
                <button
                  type="button"
                  className="btn-agregar-bloque"
                  style={{ background: '#ccc', color: '#333' }}
                  onClick={() => {
                    setEditando(false);
                    setPassword('');
                    setTelefono(user?.telefono || '');
                  }}
                >
                  Cancelar
                </button>
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

type DocRow = {
  id: number;
  titulo: string;
  tipo?: string;
  ruta_archivo?: string | null;
  updated_at?: string;
};

export function DoctorDocumentosSection() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [tipo, setTipo] = useState<string>('texto');
  const [estado, setEstado] = useState('');

  const { data: docs = [] } = useQuery({
    queryKey: ['documentos'],
    queryFn: async () => {
      const res = await fetch('/api/documentos');
      return res.ok ? res.json() : [];
    },
  });

  async function crear() {
    const res = await fetch('/api/documentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Nuevo documento', contenido: '' }),
    });
    const doc = await res.json();
    await abrir(doc.id);
    qc.invalidateQueries({ queryKey: ['documentos'] });
  }

  async function abrir(id: number) {
    const res = await fetch(`/api/documentos/${id}`);
    const doc = await res.json();
    setEditId(id);
    setTitulo(doc.titulo || '');
    setContenido(doc.contenido || '');
    setTipo(doc.tipo || (doc.ruta_archivo ? 'pdf' : 'texto'));
  }

  async function guardar() {
    if (!editId) return;
    await fetch(`/api/documentos/${editId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, contenido }),
    });
    setEstado('Guardado ✓');
    qc.invalidateQueries({ queryKey: ['documentos'] });
    setTimeout(() => setEstado(''), 2000);
  }

  async function eliminar(id: number) {
    if (!confirm('¿Eliminar este documento?')) return;
    await fetch(`/api/documentos/${id}`, { method: 'DELETE' });
    if (editId === id) setEditId(null);
    qc.invalidateQueries({ queryKey: ['documentos'] });
  }

  async function subirArchivo(file: File) {
    const form = new FormData();
    form.append('archivo', file);
    await fetch('/api/documentos/upload', { method: 'POST', body: form });
    qc.invalidateQueries({ queryKey: ['documentos'] });
  }

  function tipoBadge(doc: DocRow) {
    const t = (doc.tipo || 'texto').toLowerCase();
    if (t === 'pdf') return 'doc-item-tipo doc-item-tipo-pdf';
    if (t === 'word') return 'doc-item-tipo doc-item-tipo-word';
    return 'doc-item-tipo doc-item-tipo-texto';
  }

  return (
    <div className="seccion-panel">
      <div className="documentos-container">
        <div className="documentos-header">
          <h2>📄 Mis Documentos</h2>
          <p>Crea y gestiona tus notas y bitácoras.</p>
          <div className="documentos-header-botones">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) subirArchivo(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="btn-agregar-bloque btn-subir-archivo"
              onClick={() => fileRef.current?.click()}
            >
              📤 Subir archivo (Word/PDF)
            </button>
            <button type="button" className="btn-agregar-bloque" onClick={crear}>
              + Nuevo Documento
            </button>
          </div>
        </div>

        <div className="documentos-layout">
          <aside className="documentos-lista">
            {(docs as DocRow[]).length === 0 ? (
              <p className="texto-vacio">Sin documentos.</p>
            ) : (
              (docs as DocRow[]).map((d) => (
                <div
                  key={d.id}
                  className={`doc-item${editId === d.id ? ' doc-item-activo' : ''}`}
                  onClick={() => abrir(d.id)}
                  onKeyDown={(e) => e.key === 'Enter' && abrir(d.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={tipoBadge(d)}>{d.tipo || 'texto'}</span>
                  <span className="doc-item-titulo">{d.titulo}</span>
                </div>
              ))
            )}
          </aside>

          <section className="documento-editor">
            {!editId ? (
              <div className="editor-placeholder">
                <p>📝 Selecciona un documento de la lista o crea uno nuevo</p>
              </div>
            ) : (
              <>
                <div className="editor-toolbar">
                  <input
                    type="text"
                    className="input-titulo-doc"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Título del documento"
                  />
                  <div className="editor-acciones">
                    {tipo === 'pdf' && editId ? (
                      <a
                        href={`/api/documentos/${editId}/archivo`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-link-archivo"
                      >
                        Abrir archivo
                      </a>
                    ) : null}
                    <button type="button" className="btn-guardar-doc" onClick={guardar}>
                      💾 Guardar
                    </button>
                    <button
                      type="button"
                      className="btn-eliminar-doc"
                      onClick={() => eliminar(editId)}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
                {tipo === 'pdf' ? (
                  <iframe
                    title="Vista previa PDF"
                    src={`/api/documentos/${editId}/archivo`}
                    style={{
                      width: '100%',
                      height: '70vh',
                      border: '1px solid #ddd',
                      borderRadius: 8,
                    }}
                  />
                ) : (
                  <textarea
                    className="textarea-documento"
                    value={contenido}
                    onChange={(e) => setContenido(e.target.value)}
                    placeholder="Escribe aquí tu contenido..."
                  />
                )}
                {estado ? <p className="doc-estado-guardado">{estado}</p> : null}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
