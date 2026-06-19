'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePerfilMobileNav } from '@/lib/hooks/usePerfilMobileNav';
import '@/components/features/perfil/perfil-legacy.css';
import './panel-admin-legacy.css';

export const ADMIN_SECTION_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  citas: 'Gestión de Citas',
  psicologos: 'Psicólogos',
  pacientes: 'Pacientes',
  blog: 'Gestor de Blog',
  configuracion: 'Configuración',
};

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'citas', label: 'Citas', icon: '📅' },
  { id: 'psicologos', label: 'Psicólogos', icon: '👨‍⚕️' },
  { id: 'pacientes', label: 'Pacientes', icon: '👥' },
  { id: 'blog', label: 'Blog', icon: '📝' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙️' },
];

export function AdminShell({
  section,
  onSectionChange,
  children,
}: {
  section: string;
  onSectionChange: (id: string) => void;
  children: React.ReactNode;
}) {
  const { navToggleRef, closeMobileNav, onNavToggleChange } = usePerfilMobileNav();
  const [nombre, setNombre] = useState('A');

  useEffect(() => {
    fetch('/api/estado-sesion')
      .then((r) => r.json())
      .then((d) => {
        if (d.nombre) setNombre(String(d.nombre).charAt(0).toUpperCase());
      })
      .catch(() => undefined);
  }, []);

  const title = ADMIN_SECTION_TITLES[section] || 'Panel Admin';

  return (
    <div className="perfil-body">
      <div className="admin-container" id="admin-layout">
        <header className="perfil-mobile-header">
          <span className="perfil-mobile-title">Panel Admin</span>
          <input
            ref={navToggleRef}
            type="checkbox"
            id="perfil-nav-toggle"
            className="perfil-nav-toggle"
            aria-hidden="true"
            tabIndex={-1}
            onChange={onNavToggleChange}
          />
          <label htmlFor="perfil-nav-toggle" className="perfil-nav-toggle-label" aria-label="Abrir menú">
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
                    onClick={() => {
                      onSectionChange(item.id);
                      closeMobileNav();
                    }}
                  >
                    {item.icon} {item.label}
                  </button>
                </li>
              ))}
              <li>
                <Link href="/" className="perfil-mobile-nav-link" onClick={closeMobileNav}>
                  🌐 Volver al Sitio
                </Link>
              </li>
              <li>
                <a href="/logout" className="perfil-mobile-nav-link perfil-mobile-logout">
                  🚪 Cerrar Sesión
                </a>
              </li>
            </ul>
          </nav>
        </header>

        <aside className="admin-sidebar">
          <div className="admin-logo">
            <h2>
              <Image src="/images/logo.png" alt="Logo" width={35} height={35} />
              Admin <span>PRO</span>
            </h2>
          </div>
          <ul className="admin-nav">
            {NAV.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={section === item.id ? 'active' : ''}
                  onClick={() => onSectionChange(item.id)}
                >
                  <span className="icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            ))}
            <li>
              <a href="/logout">
                <span className="icon">🚪</span>
                <span>Cerrar Sesión</span>
              </a>
            </li>
          </ul>
        </aside>

        <main className="admin-main perfil-main">
          <header className="admin-header">
            <h1>{title}</h1>
            <div className="admin-user">
              <div className="avatar">{nombre}</div>
              <a href="/logout" className="btn-logout">
                Salir
              </a>
            </div>
          </header>
          <div className="admin-content">{children}</div>
        </main>
      </div>
    </div>
  );
}
