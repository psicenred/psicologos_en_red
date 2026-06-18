import { Link } from '@/i18n/routing';

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary to-accent p-4">
      <div className="w-full max-w-md rounded-2xl border-t-8 border-primary bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="" className="h-9 w-9 object-contain" />
            <span className="font-semibold">Psicólogos en Red</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
