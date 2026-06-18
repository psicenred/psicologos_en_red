import { PublicLayout } from '@/components/layout/PublicLayout';
import '@/components/features/legal/legal-legacy.css';

export function LegalDocument({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <PublicLayout>
      <main className="terminos-bg">
        <div className="terminos-container">
          <h1>{title}</h1>
          {subtitle ? <p className="subtitulo">{subtitle}</p> : null}
          {children}
        </div>
      </main>
    </PublicLayout>
  );
}
