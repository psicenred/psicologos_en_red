'use client';

import { useEffect, useMemo, useState } from 'react';
import { Link, usePathname } from '@/i18n/routing';
import { stripLocalePrefix } from '@/i18n/routing';
import { StudentAvatar } from '@/components/features/academia/alumno/StudentAvatar';
import {
  ClipboardList,
  Home,
  LayoutDashboard,
  ListTree,
  LogOut,
  PlusCircle,
  Settings,
  UserCircle,
  Users,
  UsersRound,
} from 'lucide-react';
import type { Course } from '@/lib/academia/types';

const COURSE_ID_RE =
  /^\/cursos\/admin\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/|$)/i;

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

interface AdminSidebarProps {
  adminName: string;
  adminEmail: string;
  avatarUrl: string | null;
  logoutAction: () => void;
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex shrink-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors md:w-full md:rounded-r-lg md:px-4 md:py-2.5 ${
        active
          ? 'border-l-4 border-primary bg-white/15 text-white'
          : 'border-l-4 border-transparent text-white/85 hover:bg-white/10 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" />
      <span>{item.label}</span>
    </Link>
  );
}

export function AdminSidebar({
  adminName,
  adminEmail,
  avatarUrl,
  logoutAction,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const normalized = stripLocalePrefix(pathname);
  const courseMatch = normalized.match(COURSE_ID_RE);
  const courseId = courseMatch?.[1] ?? null;
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (!courseId) {
      setCourse(null);
      return;
    }
    fetch(`/api/academia/courses/${courseId}`)
      .then((r) => r.json())
      .then((data) => setCourse(data.course ?? null))
      .catch(() => setCourse(null));
  }, [courseId]);

  const globalNav: NavItem[] = [
    { href: '/cursos/admin', label: 'Cursos', icon: LayoutDashboard, exact: true },
    { href: '/cursos/admin/nuevo', label: 'Nuevo curso', icon: PlusCircle },
    { href: '/cursos/admin/instructores', label: 'Instructores', icon: Users },
    { href: '/cursos/admin/perfil', label: 'Editar mi perfil', icon: UserCircle },
  ];

  const courseNav: NavItem[] = useMemo(() => {
    if (!courseId) return [];
    const base = `/cursos/admin/${courseId}`;
    const items: NavItem[] = [
      { href: base, label: 'Inicio', icon: Home, exact: true },
      { href: `${base}/configuracion`, label: 'Configuración', icon: Settings },
      { href: `${base}/temario`, label: 'Temario', icon: ListTree },
    ];
    if (course?.format === 'sync') {
      items.push({ href: `${base}/cohortes`, label: 'Cohortes', icon: UsersRound });
      items.push({ href: `${base}/asistencia`, label: 'Asistencia', icon: ClipboardList });
    }
    return items;
  }, [courseId, course?.format]);

  function isActive(item: NavItem) {
    if (item.exact) return normalized === item.href;
    return normalized === item.href || normalized.startsWith(`${item.href}/`);
  }

  const isGlobalSection =
    !courseId ||
    normalized === '/cursos/admin/nuevo' ||
    normalized.startsWith('/cursos/admin/instructores') ||
    normalized.startsWith('/cursos/admin/perfil');

  return (
    <aside className="flex w-full shrink-0 flex-col bg-secondary text-secondary-foreground shadow-lg md:w-[280px] md:min-h-screen">
      <div className="flex items-center gap-4 border-b border-white/15 px-5 py-4 md:flex-col md:items-stretch md:gap-0 md:py-4">
        <div className="flex-1 md:flex-none">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Academia</p>
          <p className="mt-0.5 text-sm font-bold text-white">Psicólogos en Red</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-primary/90">
            Panel administrador
          </p>
        </div>
        <div className="flex items-center gap-3 md:hidden">
          <StudentAvatar name={adminName} avatarUrl={avatarUrl} size="sm" />
          <div className="min-w-0 text-left">
            <p className="truncate text-sm font-semibold text-white">{adminName}</p>
          </div>
        </div>
      </div>

      <div className="hidden border-b border-white/15 px-5 py-6 text-center md:block">
        <div className="mx-auto mb-3 flex justify-center">
          <StudentAvatar name={adminName} avatarUrl={avatarUrl} size="lg" />
        </div>
        <p className="truncate text-base font-semibold text-white">{adminName}</p>
        <p className="mt-0.5 truncate text-xs text-white/70">{adminEmail}</p>
      </div>

      <nav className="flex-1 overflow-x-auto overflow-y-auto py-3 md:py-4">
        {isGlobalSection ? (
          <div className="flex gap-1 px-2 md:block md:space-y-0.5">
            <p className="mb-2 hidden px-4 text-[10px] font-semibold uppercase tracking-wider text-white/50 md:block">
              Principal
            </p>
            {globalNav.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item)} />
            ))}
          </div>
        ) : (
          <>
            <div className="mb-4 px-5">
              <Link
                href="/cursos/admin"
                className="text-xs text-white/70 underline-offset-2 hover:text-white hover:underline"
              >
                ← Cursos
              </Link>
              <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-white">
                {course?.title ?? 'Cargando curso…'}
              </p>
            </div>
            <div className="flex gap-1 px-2 md:block md:space-y-0.5">
              <p className="mb-2 hidden px-4 text-[10px] font-semibold uppercase tracking-wider text-white/50 md:block">
                Curso
              </p>
              {courseNav.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item)} />
              ))}
            </div>
            <div className="mt-4 flex gap-1 border-t border-white/15 px-2 pt-4 md:block md:space-y-0.5">
              <NavLink
                item={{ href: '/cursos/admin/perfil', label: 'Editar mi perfil', icon: UserCircle }}
                active={normalized.startsWith('/cursos/admin/perfil')}
              />
            </div>
          </>
        )}
      </nav>

      <div className="border-t border-white/15 p-3 md:p-4">
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white md:justify-start md:gap-3 md:py-2.5"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Cerrar sesión</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
