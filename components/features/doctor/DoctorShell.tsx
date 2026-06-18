'use client';

import Link from 'next/link';
import '@/components/features/perfil/perfil-legacy.css';
import './panel-doctor-legacy.css';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'chat', label: 'Mis Mensajes', icon: '💬', badge: true },
  { id: 'video', label: 'Sala de Video', icon: '🎥' },
  { id: 'pacientes', label: 'Pacientes', icon: '👥' },
  { id: 'documentos', label: 'Documentos', icon: '📄' },
  { id: 'agenda', label: 'Configuración', icon: '⚙️' },
];

export function DoctorShell({
  section,
  onSectionChange,
  nombre,
  unreadCount = 0,
  children,
}: {
  section: string;
  onSectionChange: (id: string) => void;
  nombre: string;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const inicial = (nombre || 'E').charAt(0).toUpperCase();
  const badgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);
  const showBadge = unreadCount > 0;

  return (
    <div className="perfil-body">
      <div className="perfil-layout" id="perfil-layout">
        <header className="perfil-mobile-header">
          <span className="perfil-mobile-title">Panel Especialista</span>
          <input
            type="checkbox"
            id="perfil-nav-toggle"
            className="perfil-nav-toggle"
            aria-hidden="true"
            tabIndex={-1}
          />
          <label
            htmlFor="perfil-nav-toggle"
            className="perfil-nav-toggle-label"
            aria-label="Abrir menú"
          >
            <span />
            <span />
            <span />
          </label>
          <nav className="perfil-mobile-nav">
            <ul className="perfil-mobile-nav-list">
              {NAV.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`perfil-mobile-nav-btn${section === item.id ? ' active' : ''}`}
                    onClick={() => onSectionChange(item.id)}
                  >
                    {item.icon} {item.label}
                    {item.badge && showBadge ? (
                      <span className="nav-badge nav-badge-mobile">{badgeLabel}</span>
                    ) : null}
                  </button>
                </li>
              ))}
              <li>
                <Link href="/" className="perfil-mobile-nav-link">
                  🌐 Volver al Sitio
                </Link>
              </li>
              <li>
                <Link href="/logout" className="perfil-mobile-nav-link perfil-mobile-logout">
                  🚪 Cerrar Sesión
                </Link>
              </li>
            </ul>
          </nav>
        </header>

        <aside className="perfil-sidebar" id="perfil-sidebar">
          <div className="sidebar-header">
            <div className="user-avatar" id="avatar-doctor">
              {inicial}
            </div>
            <h3 className="sidebar-nombre" id="nombre-doctor">
              {nombre || 'Especialista'}
            </h3>
            <span className="status-badge sidebar-texto">Modo Especialista</span>
          </div>

          <nav className="sidebar-nav">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item${section === item.id ? ' active' : ''}`}
                onClick={() => onSectionChange(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.badge && showBadge ? (
                  <span className="nav-badge nav-badge-visible">{badgeLabel}</span>
                ) : null}
              </button>
            ))}
            <Link href="/" className="nav-item-link">
              <span className="nav-icon">🌐</span>
              <span className="nav-label">Volver al Sitio</span>
            </Link>
          </nav>

          <div className="sidebar-footer">
            <Link href="/logout" className="btn-logout">
              <span className="nav-icon">🚪</span>
              <span className="nav-label">Cerrar Sesión</span>
            </Link>
          </div>
        </aside>

        <main className="perfil-main">{children}</main>
      </div>
    </div>
  );
}
