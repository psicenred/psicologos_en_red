import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { getPublicSessionState } from '@/lib/auth/public-session';

export async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getPublicSessionState();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader initialSession={session} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
