'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { DailyRoom } from '@/components/features/video/DailyRoom';
import { PrivateChat } from '@/components/features/chat/PrivateChat';
import { ReagendarDialog } from '@/components/features/citas/ReagendarDialog';
import { PerfilAgendarDialog } from '@/components/features/perfil/PerfilAgendarDialog';
import {
  type CitaPaciente,
  estadoClass,
  formatCitaFecha,
  formatCitaHora,
  getProximaCita,
  puedeCancelar,
  puedeReagendar,
  puedeUnirseVideo,
  splitCitas,
} from './perfil-helpers';

const HISTORIAL_PAGE = 6;

type Contacto = { id: number; nombre: string };

export function PerfilDashboardSection({
  nombre,
  citas,
  onVerCitas,
}: {
  nombre: string;
  citas: CitaPaciente[];
  onVerCitas: () => void;
}) {
  const proxima = getProximaCita(citas);

  return (
    <div className="seccion-panel">
      <div className="welcome-banner">
        <h1>
          Hola, <span>{nombre || '…'}</span> 👋
        </h1>
        <p>Hoy es un buen día para cuidar de tu salud mental.</p>
      </div>

      <div className="resumen-inicio-simple">
        <div className="proxima-cita-destacada">
          <h3>Tu próxima sesión</h3>
          {proxima ? (
            <div>
              <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{proxima.psicologo_nombre}</p>
              <p style={{ margin: 0, color: '#666' }}>
                📅 {formatCitaFecha(proxima)} · ⏰ {formatCitaHora(proxima)}
              </p>
            </div>
          ) : (
            <p style={{ color: '#888' }}>No tienes citas pendientes para hoy.</p>
          )}
          {!proxima ? (
            <div className="cta-agendar-wrap">
              <Link href="/catalogo" className="btn-agendar-cta">
                Agendar Cita
              </Link>
            </div>
          ) : null}
          <button type="button" className="btn-ver-todas" onClick={onVerCitas}>
            Ver mi agenda completa
          </button>
        </div>
      </div>
    </div>
  );
}

function CitaCard({
  cita,
  esFutura,
  video15Min,
  joining,
  onVideo,
  onReagendar,
  onCancelar,
  onOpinar,
  onAgendarOtra,
  onDetalle,
}: {
  cita: CitaPaciente;
  esFutura: boolean;
  video15Min: boolean;
  joining?: boolean;
  onVideo: () => void;
  onReagendar: () => void;
  onCancelar: () => void;
  onOpinar: () => void;
  onAgendarOtra: () => void;
  onDetalle: () => void;
}) {
  const estado = (cita.estado || '').toString();
  const puedeUnirse = puedeUnirseVideo(cita, video15Min);

  const botonPrincipal = esFutura ? (
    puedeUnirse ? (
      <button
        type="button"
        className="btn-entrar-sesion"
        onClick={onVideo}
        disabled={joining}
      >
        {joining ? '⏳ Conectando…' : '🎥 Unirse'}
      </button>
    ) : (
      <button
        type="button"
        className="btn-entrar-sesion btn-entrar-sesion-deshabilitado"
        title="Se activará 15 min antes; podrás unirte hasta 60 min después del inicio"
        onClick={() =>
          alert(
            'Se activará 15 minutos antes de la cita y podrás unirte hasta 60 min después del inicio.',
          )
        }
      >
        🎥 Unirse
      </button>
    )
  ) : (
    <button type="button" className="btn-entrar-sesion" onClick={onDetalle}>
      📄 Ver detalles
    </button>
  );

  return (
    <div className="cita-card-panel cita-card-v2">
      <div className="cita-card-header">
        <h4 className="cita-card-title">Sesión con {cita.psicologo_nombre}</h4>
        <span className={`cita-estado-pill ${estadoClass(estado)}`}>{estado}</span>
      </div>
      <div className="cita-card-meta">
        <span>📅 {formatCitaFecha(cita)}</span>
        <span>⏰ {formatCitaHora(cita)}</span>
      </div>
      <div className="cita-card-actions">
        {botonPrincipal}
        <button
          type="button"
          className="btn-cita-secundario btn-agendar-otra"
          onClick={onAgendarOtra}
        >
          ➕ Agendar cita
        </button>
        {esFutura && puedeReagendar(cita) ? (
          <button type="button" className="btn-cita-secundario" onClick={onReagendar}>
            🔁 Reagendar
          </button>
        ) : null}
        {esFutura && puedeCancelar(cita) ? (
          <button type="button" className="btn-cita-danger" onClick={onCancelar}>
            ❌ Cancelar
          </button>
        ) : null}
        {!esFutura && estado.toLowerCase() === 'realizada' ? (
          <button type="button" className="btn-opinar-cita" onClick={onOpinar}>
            ⭐ Opinar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PerfilCitasSection({
  citas,
  video15Min,
  onVideo,
  onRefetch,
  joiningCitaId = null,
}: {
  citas: CitaPaciente[];
  video15Min: boolean;
  onVideo: (cita: CitaPaciente) => void;
  onRefetch: () => void;
  joiningCitaId?: number | null;
}) {
  const [reagendar, setReagendar] = useState<CitaPaciente | null>(null);
  const [agendar, setAgendar] = useState<{ psicologoId: number; nombre: string } | null>(
    null,
  );
  const [historialLimit, setHistorialLimit] = useState(HISTORIAL_PAGE);
  const [opinion, setOpinion] = useState<{
    psicologoId: number;
    nombre: string;
  } | null>(null);
  const [estrellas, setEstrellas] = useState('5');
  const [comentario, setComentario] = useState('');
  const [detalle, setDetalle] = useState<CitaPaciente | null>(null);

  const { proximas, pasadas } = splitCitas(citas);
  const pasadasVisibles = pasadas.slice(0, historialLimit);

  async function cancelar(citaId: number) {
    if (!confirm('¿Seguro que deseas cancelar esta cita?')) return;
    await fetch('/api/cancelar-cita', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cita_id: citaId }),
    });
    onRefetch();
  }

  async function enviarOpinion() {
    if (!opinion) return;
    const res = await fetch('/api/dejar-opinion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        psicologo_id: opinion.psicologoId,
        comentario,
        estrellas: parseInt(estrellas, 10),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'No se pudo guardar la opinión');
      return;
    }
    alert(data.mensaje || '¡Opinión guardada!');
    setOpinion(null);
    setComentario('');
    setEstrellas('5');
  }

  return (
    <div className="seccion-panel">
      <header className="video-header">
        <h2>📅 Mis Citas</h2>
        <p>Aquí puedes ver todas tus sesiones programadas y tu historial.</p>
        <p className="perfil-citas-leyenda">
          Horarios mostrados en tu hora local (según tu dispositivo).
        </p>
      </header>

      <div className="citas-secciones-container">
        <section className="citas-proximas">
          <h3>Próximas Sesiones</h3>
          <div className="grid-citas-panel">
            {proximas.length === 0 ? (
              <p style={{ padding: 20, color: '#888' }}>No tienes citas próximas.</p>
            ) : (
              proximas.map((c) => (
                <CitaCard
                  key={c.id}
                  cita={c}
                  esFutura
                  video15Min={video15Min}
                  joining={joiningCitaId === c.id}
                  onVideo={() => onVideo(c)}
                  onReagendar={() => setReagendar(c)}
                  onCancelar={() => cancelar(c.id)}
                  onOpinar={() =>
                    setOpinion({ psicologoId: c.psicologo_id, nombre: c.psicologo_nombre })
                  }
                  onAgendarOtra={() =>
                    setAgendar({ psicologoId: c.psicologo_id, nombre: c.psicologo_nombre })
                  }
                  onDetalle={() => setDetalle(c)}
                />
              ))
            )}
          </div>
        </section>

        <hr />

        <section className="citas-pasadas">
          <h3>Historial de Sesiones</h3>
          <div className="grid-citas-panel historial">
            {pasadasVisibles.length === 0 ? (
              <p style={{ padding: 20, color: '#888' }}>Sin historial de citas.</p>
            ) : (
              pasadasVisibles.map((c) => (
                <CitaCard
                  key={c.id}
                  cita={c}
                  esFutura={false}
                  video15Min={video15Min}
                  onVideo={() => onVideo(c)}
                  onReagendar={() => setReagendar(c)}
                  onCancelar={() => cancelar(c.id)}
                  onOpinar={() =>
                    setOpinion({ psicologoId: c.psicologo_id, nombre: c.psicologo_nombre })
                  }
                  onAgendarOtra={() =>
                    setAgendar({ psicologoId: c.psicologo_id, nombre: c.psicologo_nombre })
                  }
                  onDetalle={() => setDetalle(c)}
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
        </section>
      </div>

      {reagendar ? (
        <ReagendarDialog
          open
          onOpenChange={(o) => !o && setReagendar(null)}
          citaId={reagendar.id}
          psicologoId={reagendar.psicologo_id}
          onSuccess={() => {
            setReagendar(null);
            onRefetch();
          }}
        />
      ) : null}

      {agendar ? (
        <PerfilAgendarDialog
          open
          onOpenChange={(o) => !o && setAgendar(null)}
          psicologoId={agendar.psicologoId}
          psicologoNombre={agendar.nombre}
        />
      ) : null}

      {opinion ? (
        <div className="perfil-modal-overlay" role="dialog">
          <div className="perfil-modal">
            <h3>Califica tu experiencia</h3>
            <p style={{ fontSize: '0.9rem', color: '#666' }}>Con {opinion.nombre}</p>
            <div style={{ margin: '20px 0' }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                ¿Cuántas estrellas le das?
              </label>
              <select value={estrellas} onChange={(e) => setEstrellas(e.target.value)}>
                <option value="5">⭐⭐⭐⭐⭐ (Excelente)</option>
                <option value="4">⭐⭐⭐⭐ (Muy bueno)</option>
                <option value="3">⭐⭐⭐ (Bueno)</option>
                <option value="2">⭐⭐ (Regular)</option>
                <option value="1">⭐ (Malo)</option>
              </select>
            </div>
            <div style={{ margin: '20px 0' }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>
                Tu comentario:
              </label>
              <textarea
                rows={4}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="¿Cómo te sentiste en la sesión?"
              />
            </div>
            <div className="perfil-modal-actions">
              <button type="button" onClick={() => setOpinion(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={enviarOpinion}>
                Publicar Opinión
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detalle ? (
        <div className="perfil-modal-overlay" role="dialog">
          <div className="perfil-modal">
            <h3>Detalle de cita</h3>
            <div style={{ display: 'grid', gap: 8, margin: '15px 0', color: '#444' }}>
              <p style={{ margin: 0 }}>
                <strong>Psicólogo:</strong> {detalle.psicologo_nombre}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Fecha:</strong> {formatCitaFecha(detalle)}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Hora:</strong> {formatCitaHora(detalle)}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Estado:</strong> {detalle.estado}
              </p>
            </div>
            <div className="perfil-modal-actions">
              <button type="button" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PerfilVideoSection({
  infoSesion,
  room,
  error,
  onLeave,
}: {
  infoSesion: string;
  room: { url: string; token: string } | null;
  error: string | null;
  onLeave: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  function pantallaCompleta() {
    const el = containerRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
  }

  return (
    <div className="seccion-panel" id="seccion-video">
      <header className="video-header">
        <div>
          <h2>Sesión en Vivo</h2>
          <p id="info-sesion">{infoSesion}</p>
        </div>
        <button
          type="button"
          className="btn-pantalla-completa-video"
          title="Pantalla completa"
          onClick={pantallaCompleta}
        >
          ⛶ Pantalla completa
        </button>
      </header>
      <div className="perfil-video-container" ref={containerRef} id="jitsi-container">
        {error ? <p style={{ color: '#fff', padding: 20 }}>{error}</p> : null}
        {room ? <DailyRoom url={room.url} token={room.token} onLeave={onLeave} /> : (
          <p style={{ color: '#aaa', padding: 20, textAlign: 'center' }}>
            Selecciona una cita y pulsa «Unirse» para iniciar la videollamada.
          </p>
        )}
      </div>
    </div>
  );
}

export function PerfilChatSection({ contactos }: { contactos: Contacto[] }) {
  return (
    <div className="seccion-panel" id="seccion-chat">
      <PrivateChat contactos={contactos} variant="legacy" />
    </div>
  );
}

export function PerfilConfigSection({
  user,
  onSaved,
}: {
  user: {
    nombre: string;
    email: string;
    telefono: string | null;
    contacto_emergencia: string | null;
  };
  onSaved: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [nombre, setNombre] = useState(user.nombre);
  const [telefono, setTelefono] = useState(user.telefono || '');
  const [contacto, setContacto] = useState(user.contacto_emergencia || '');
  const [password, setPassword] = useState('');

  useEffect(() => {
    setNombre(user.nombre);
    setTelefono(user.telefono || '');
    setContacto(user.contacto_emergencia || '');
  }, [user.nombre, user.telefono, user.contacto_emergencia]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        telefono,
        contacto_emergencia: contacto,
        password: password || undefined,
      }),
    });
    setEditando(false);
    setPassword('');
    onSaved();
    alert('Perfil actualizado');
  }

  function cancelar() {
    setNombre(user.nombre);
    setTelefono(user.telefono || '');
    setContacto(user.contacto_emergencia || '');
    setPassword('');
    setEditando(false);
  }

  const inputClass = editando ? 'input-editable' : 'input-readonly';

  return (
    <div className="seccion-panel">
      <header className="video-header">
        <h2>Configuración de Cuenta</h2>
        <p>Administra tu información personal y seguridad.</p>
      </header>

      <div className="config-grid">
        <div className="config-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: 0 }}>👤 Datos de la Cuenta</h3>
            {!editando ? (
              <button type="button" className="btn-editar-v2" onClick={() => setEditando(true)}>
                Editar Perfil
              </button>
            ) : null}
          </div>

          <form onSubmit={guardar}>
            <div className="form-group-config">
              <label htmlFor="config-nombre">Nombre Completo</label>
              <input
                id="config-nombre"
                type="text"
                className={inputClass}
                value={nombre}
                readOnly={!editando}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="form-group-config">
              <label htmlFor="config-email">Correo Electrónico (No modificable)</label>
              <input
                id="config-email"
                type="email"
                className="input-readonly"
                value={user.email}
                readOnly
                style={{ background: '#f0f0f0', cursor: 'not-allowed' }}
              />
            </div>
            <div className="form-group-config">
              <label htmlFor="config-tel">Número de Teléfono</label>
              <input
                id="config-tel"
                type="tel"
                className={inputClass}
                value={telefono}
                readOnly={!editando}
                placeholder="No registrado"
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
            <div className="form-group-config">
              <label htmlFor="config-contacto">Contacto de emergencia</label>
              <input
                id="config-contacto"
                type="text"
                className={inputClass}
                value={contacto}
                readOnly={!editando}
                placeholder="Nombre y/o teléfono de quien avisar en caso de emergencia"
                onChange={(e) => setContacto(e.target.value)}
              />
            </div>
            <div className="form-group-config">
              <label htmlFor="config-pass">Contraseña</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  id="config-pass"
                  type={showPass ? 'text' : 'password'}
                  className={inputClass}
                  value={editando ? password : '********'}
                  readOnly={!editando}
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
                      fontSize: '1.2rem',
                    }}
                  >
                    👁️
                  </button>
                ) : null}
              </div>
            </div>

            {editando ? (
              <div className="config-acciones">
                <button type="submit" className="btn-config-save">
                  Guardar Cambios
                </button>
                <button type="button" className="btn-config-save outline" onClick={cancelar}>
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
