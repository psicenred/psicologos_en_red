'use client';

import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export type NavItem = {
  id: string;
  label: string;
  icon: string;
  href?: string;
  badge?: number;
};

export function DashboardShell({
  title,
  nav,
  children,
  activeSection,
  onSectionChange,
}: {
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (id: string) => void;
}) {
  return (
    <div className="flex min-h-screen bg-hueso">
      <aside className="hidden w-64 flex-col bg-[#332E2A] text-white md:flex">
        <div className="border-b border-white/10 p-6">
          <p className="text-lg font-bold text-primary">{title}</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) =>
            item.href ? (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/10"
              >
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="rounded-full bg-destructive px-1.5 text-xs text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition',
                  activeSection === item.id ? 'bg-primary text-white' : 'hover:bg-white/10',
                )}
              >
                <span>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className="rounded-full bg-destructive px-1.5 text-xs text-white">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            ),
          )}
        </nav>
        <div className="border-t border-white/10 p-3">
          <a href="/logout" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/10">
            🚪 Cerrar sesión
          </a>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
          <span className="font-semibold">{title}</span>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={activeSection}
            onChange={(e) => onSectionChange(e.target.value)}
          >
            {nav.filter((n) => !n.href).map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
