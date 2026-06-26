'use client';

import { useEffect, useState } from 'react';
import { usePerfilMobileNav } from '@/lib/hooks/usePerfilMobileNav';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import type { PublicSessionState } from '@/lib/auth/public-session';
import './header-legacy.css';

type SessionState = PublicSessionState;

function perfilLabelForSession(session: SessionState, t: (key: string, values?: { name: string }) => string) {
  if (!session.autenticado) return t('myProfile');
  if (session.rol === 'admin') return t('adminPanel');
  if (session.rol === 'psicologo') return t('doctorPanel');

  const firstName = (session.nombre || '').trim().split(/\s+/)[0];
  if (firstName) return t('userProfileOf', { name: firstName });
  return t('userProfile');
}

export function SiteHeader({ initialSession }: { initialSession?: SessionState }) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { navToggleRef, closeMobileNav, onNavToggleChange } = usePerfilMobileNav();
  const [session, setSession] = useState<SessionState>(
    initialSession ?? { autenticado: false },
  );

  const NAV: { href: string; label: string; hideInPwa?: boolean }[] = [
    { href: '/', label: t('home'), hideInPwa: true },
    { href: '/catalogo', label: t('psychologists') },
    { href: '/academia', label: t('academy'), hideInPwa: true },
    { href: '/blog', label: t('blog') },
  ];

  useEffect(() => {
    fetch('/api/estado-sesion', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((data: SessionState) => setSession(data))
      .catch(() => setSession({ autenticado: false }));
  }, [pathname]);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        Boolean(
          (window.navigator as Navigator & { standalone?: boolean }).standalone,
        ))
    ) {
      document.documentElement.classList.add('pwa-standalone');
      document.body.classList.add('pwa-standalone');
    }
  }, []);

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  const perfilHref =
    session.rol === 'psicologo'
      ? '/panel-doctor'
      : session.rol === 'admin'
        ? '/panel-admin'
        : '/perfil';

  const perfilLabel = perfilLabelForSession(session, t);

  return (
    <header className="main-header">
      <Link href="/" className="logo">
        <Image src="/images/logo.png" alt="Logo" width={40} height={40} priority />
        <span>Psicólogos en Red</span>
      </Link>

      <input
        ref={navToggleRef}
        type="checkbox"
        id="nav-toggle"
        className="nav-toggle"
        aria-hidden="true"
        tabIndex={-1}
        onChange={onNavToggleChange}
      />
      <label htmlFor="nav-toggle" className="nav-toggle-label" aria-label={t('menu')}>
        <span />
        <span />
        <span />
      </label>

      <nav className="main-nav">
        <ul>
          {NAV.map((item) => (
            <li key={item.href} className={item.hideInPwa ? 'nav-hide-in-pwa' : undefined}>
              <Link href={item.href} onClick={closeMobileNav}>
                {item.label}
              </Link>
            </li>
          ))}
          <li className="nav-lang-item nav-hide-in-pwa">
            <LanguageSwitcher onChange={closeMobileNav} />
          </li>
          <li>
            <Link href={perfilHref} className="btn-perfil" onClick={closeMobileNav}>
              {session.autenticado ? (
                <span>👤 {perfilLabel}</span>
              ) : (
                perfilLabel
              )}
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
