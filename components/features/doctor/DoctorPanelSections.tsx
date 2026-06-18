'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DailyRoom } from '@/components/features/video/DailyRoom';
import { PrivateChat } from '@/components/features/chat/PrivateChat';
import {
  type CitaDoctor,
  diasSinCita,
  esCitaFutura,
  formatCitaFecha,
  formatCitaHora,
  puedeUnirseVideo,
  splitCitasDoctor,
} from './doctor-helpers';

const HISTORIAL_PAGE = 6;

function CitaCardDoctor({
  cita,
  esFutura,
  video15Min,
  joining,
  onVideo,
  onNotas,
}: {
  cita: CitaDoctor;
  esFutura: boolean;
  video15Min: boolean;
  joining?: boolean;
  onVideo: () => void;
  onNotas: () => void;
}) {
  const estado = (cita.estado || '').toLowerCase();
  const puedeUnirse = puedeUnirseVideo(cita, video15Min);

  const botonVideo = esFutura ? (
    puedeUnirse ? (
      <button
        type="button"
        className="btn-entrar"
        onClick={onVideo}
        disabled={joining}
      >
        {joining ? '⏳ Conectando…' : '🎥 Iniciar Sesión'}
      </button>
    ) : (
      <button
        type="button"
        className="btn-entrar btn-entrar-deshabilitado"
        title="Se activará 15 min antes"
        onClick={() =>
          alert(
            'Se activará 15 minutos antes de la cita y podrás unirte hasta 60 min después del inicio.',
          )
        }
      >
        🎥 Iniciar Sesión
      </button>
    )
  ) : (
    <span
      className={
        estado === 'cancelada'
          ? 'badge-cancelada'
          : estado === 'realizada'
            ? 'badge-finalizada'
            : 'badge-no-realizada'
      }
    >
      {estado === 'cancelada'
        ? 'Cancelada'
        : estado === 'realizada'
          ? 'Realizada'
          : 'No realizada'}
    </span>
  );

  return (
    <div className={`cita-card ${esFutura ? 'border-dorado' : 'grisaceo'}`}>
      <div className="cita-info">
        <h4>{cita.paciente_nombre}</h4>
        <span>
          {formatCitaFecha(cita)} | {formatCitaHora(cita)}
        </span>
        <p>
          <strong>Motivo:</strong> {cita.motivo || 'No especificado'}
        </p>
      </div>
      <div className="cita-acciones">
        {botonVideo}
        <button type="button" className="btn-chat-icon" onClick={onNotas} title="Notas">
          📝
        </button>
      </div>
    </div>
  );
}

export function DoctorDashboardSection({
  citas,
  video15Min,
  onVideo,
  onNotas,
  joiningCitaId = null,
}: {
  citas: CitaDoctor[];
  video15Min: boolean;
  onVideo: (cita: CitaDoctor) => void;
  onNotas: (cita: CitaDoctor) => void;
  joiningCitaId?: number | null;
}) {
  const [filtroPaciente, setFiltroPaciente] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [historialLimit, setHistorialLimit] = useState(HISTORIAL_PAGE);

  const filtradas = useMemo(() => {
    return citas.filter((c) => {
      const nombre = (c.paciente_nombre || '').toLowerCase();
      if (filtroPaciente && !nombre.includes(filtroPaciente.toLowerCase())) return false;
      const fecha = String(c.fecha).slice(0, 10);
      if (filtroDesde && fecha < filtroDesde) return false;
      if (filtroHasta && fecha > filtroHasta) return false;
      return true;
    });
  }, [citas, filtroPaciente, filtroDesde, filtroHasta]);

  const { proximas, pasadas } = splitCitasDoctor(filtradas);
  const pasadasVisibles = pasadas.slice(0, historialLimit);

  return (
    <div className="seccion-panel">
      <div className="welcome-banner">
        <h1>Panel del Especialista 👋</h1>
        <p>Gestiona tus consultas y pacientes.</p>
      </div>

      <div className="listas-citas-container">
        <div className="filtros-citas">
          <div className="filtro-item filtro-paciente">
            <label htmlFor="filtro-paciente">Paciente</label>
            <input
              id="filtro-paciente"
              type="text"
              placeholder="Buscar por nombre..."
              value={filtroPaciente}
              onChange={(e) => setFiltroPaciente(e.target.value)}
            />
          </div>
          <div className="filtro-item">
            <label htmlFor="filtro-desde">Desde</label>
            <input
              id="filtro-desde"
              type="date"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
            />
          </div>
          <div className="filtro-item">
            <label htmlFor="filtro-hasta">Hasta</label>
            <input
              id="filtro-hasta"
              type="date"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
            />
          </div>
          <div className="filtro-item filtro-acciones">
            <button
              type="button"
              className="btn-cita-secundario"
              onClick={() => {
                setFiltroPaciente('');
                setFiltroDesde('');
                setFiltroHasta('');
              }}
            >
              Limpiar
            </button>
          </div>
        </div>

        <h2 className="titulo-seccion">📅 Próximas Citas</h2>
        <div className="grid-citas-panel">
          {proximas.length === 0 ? (
            <p style={{ padding: 20, color: '#888' }}>No hay citas próximas.</p>
          ) : (
            proximas.map((c) => (
              <CitaCardDoctor
                key={c.cita_id}
                cita={c}
                esFutura
                video15Min={video15Min}
                joining={joiningCitaId === c.cita_id}
                onVideo={() => onVideo(c)}
                onNotas={() => onNotas(c)}
              />
            ))
          )}
        </div>

        <hr style={{ margin: '40px 0', border: 0, borderTop: '1px solid #ddd' }} />

        <h2 className="titulo-seccion" style={{ color: '#888' }}>
          ⌛ Historial de Sesiones
        </h2>
        <div className="grid-citas-panel historial">
          {pasadasVisibles.length === 0 ? (
            <p style={{ padding: 20, color: '#888' }}>Sin historial.</p>
          ) : (
            pasadasVisibles.map((c) => (
              <CitaCardDoctor
                key={c.cita_id}
                cita={c}
                esFutura={false}
                video15Min={video15Min}
                onVideo={() => onVideo(c)}
                onNotas={() => onNotas(c)}
              />
            ))
          )}
        </div>
        {pasadas.length > historialLimit ? (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn-cita-secundario"
              onClick={() => setHistorialLimit((n) => n + HISTORIAL_PAGE)}
            >
              Cargar más
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function DoctorPacientesSection({
  pacientes,
}: {
  pacientes: Record<string, unknown>[];
}) {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = pacientes.filter((p) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      String(p.nombre || '').toLowerCase().includes(q) ||
      String(p.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="seccion-panel">
      <div className="documentos-container">
        <div className="documentos-header">
          <h2>👥 Mis Pacientes</h2>
          <p>Pacientes que han agendado cita contigo.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <span style={{ fontSize: '1.2rem' }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: '0.95rem',
                minWidth: 220,
              }}
            />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="doctor-tabla-pacientes">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Contacto emergencia</th>
                <th>Total Citas</th>
                <th>Días sin cita</th>
                <th>Motivo consulta</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>
                    Sin pacientes
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
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
                    <td>{String(p.motivo_consulta || '—')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DoctorVideoSection({
  titulo,
  room,
  error,
  citaSeleccionada,
  onLeave,
  onNotasSaved,
}: {
  titulo: string;
  room: { url: string; token: string } | null;
  error: string | null;
  citaSeleccionada: CitaDoctor | null;
  onLeave: () => void;
  onNotasSaved?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [notas, setNotas] = useState(citaSeleccionada?.notas || '');
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    setNotas(citaSeleccionada?.notas || '');
  }, [citaSeleccionada]);

  async function guardarNotas() {
    if (!citaSeleccionada) return;
    await fetch(`/api/citas/${citaSeleccionada.cita_id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas }),
    });
    setGuardado(true);
    onNotasSaved?.();
    setTimeout(() => setGuardado(false), 2000);
  }

  return (
    <div className="seccion-panel" id="seccion-video">
      <header className="video-header" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 id="info-video-titulo">{titulo}</h2>
          <p style={{ margin: 0 }}>Inicia la sesión cuando estés listo.</p>
        </div>
        <button
          type="button"
          className="btn-pantalla-completa-video"
          onClick={() => containerRef.current?.requestFullscreen?.()}
        >
          ⛶ Pantalla completa
        </button>
      </header>

      <div
        className="perfil-video-container"
        ref={containerRef}
        id="jitsi-container"
        style={{ background: '#000', borderRadius: 12 }}
      >
        {error ? <p style={{ color: '#fff', padding: 20 }}>{error}</p> : null}
        {room ? (
          <DailyRoom url={room.url} token={room.token} onLeave={onLeave} />
        ) : (
          <p style={{ color: '#aaa', padding: 20, textAlign: 'center' }}>
            Selecciona una cita y pulsa «Iniciar Sesión».
          </p>
        )}
      </div>

      <div className="dash-card" style={{ marginTop: 15 }}>
        <h3 style={{ marginTop: 0 }}>📝 Notas de la sesión</h3>
        <p style={{ marginTop: 0, color: '#666', fontSize: '0.9rem' }}>
          {citaSeleccionada
            ? `Paciente: ${citaSeleccionada.paciente_nombre}`
            : 'Selecciona una cita para escribir notas.'}
        </p>
        <textarea
          id="notas-textarea"
          rows={6}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 12,
            border: '1px solid #ddd',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          placeholder="Escribe tus notas aquí..."
          value={notas}
          disabled={!citaSeleccionada}
          onChange={(e) => setNotas(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <button
            type="button"
            className="btn-guardar"
            style={{ maxWidth: 220 }}
            disabled={!citaSeleccionada}
            onClick={guardarNotas}
          >
            {guardado ? 'Guardado ✓' : 'Guardar notas'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DoctorChatSection({
  contactos,
  contactosLoading,
  contactosError,
}: {
  contactos: { id: number; nombre: string }[];
  contactosLoading?: boolean;
  contactosError?: string | null;
}) {
  return (
    <div className="seccion-panel" id="seccion-chat">
      <PrivateChat
        contactos={contactos}
        contactosLoading={contactosLoading}
        contactosError={contactosError}
        variant="legacy-doctor"
      />
    </div>
  );
}

export function DoctorNotasModal({
  cita,
  onClose,
  onSaved,
}: {
  cita: CitaDoctor;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [notas, setNotas] = useState(cita.notas || '');

  async function guardar() {
    await fetch(`/api/citas/${cita.cita_id}/notas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notas }),
    });
    onSaved?.();
    onClose();
  }

  return (
    <div className="perfil-modal-overlay" role="dialog">
      <div className="perfil-modal">
        <h3>📝 Notas</h3>
        <p style={{ marginTop: 0, color: '#666', fontSize: '0.9rem' }}>
          {cita.paciente_nombre} · {formatCitaFecha(cita)} · {formatCitaHora(cita)}
        </p>
        <textarea
          rows={8}
          style={{
            width: '100%',
            padding: 12,
            borderRadius: 12,
            border: '1px solid #ddd',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-cita-secundario" onClick={onClose}>
            Cerrar
          </button>
          <button type="button" className="btn-guardar" style={{ width: 'auto' }} onClick={guardar}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
