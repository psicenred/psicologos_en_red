import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { InstallAppButton } from '@/components/layout/InstallAppButton';
import { SocialLinks } from '@/components/layout/SocialLinks';
import './footer-legacy.css';

export async function SiteFooter() {
  const t = await getTranslations('footer');

  const quickLinks = [
    { href: '/' as const, label: t('home') },
    { href: '/registro' as const, label: t('register') },
    { href: '/login' as const, label: t('login') },
    { href: '/terminos-condiciones' as const, label: t('termsFull') },
    { href: '/aviso-privacidad' as const, label: t('privacyFull') },
    { href: '/contacto' as const, label: t('contact') },
    { href: '/trabaja-con-nosotros' as const, label: t('careersFull') },
  ];

  return (
    <footer className="main-footer">
      <div className="footer-container">
        <div className="footer-col">
          <h3>Psicólogos en Red</h3>
          <p>{t('tagline')}</p>
          <SocialLinks />
        </div>

        <div className="footer-col">
          <h4>{t('quickLinks')}</h4>
          <ul>
            {quickLinks.map((link) => (
              <li key={link.href + link.label}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="footer-col">
          <h4>{t('contactTitle')}</h4>
          <p>📍 {t('location')}</p>
          <p>
            📧{' '}
            <a href="mailto:contacto@psicologosenred.com" style={{ color: 'inherit' }}>
              contacto@psicologosenred.com
            </a>
          </p>
          <p>📞 +52 55 3077 6194</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} Psicólogos en Red. {t('rights')}
        </p>
        <InstallAppButton />
      </div>
    </footer>
  );
}
