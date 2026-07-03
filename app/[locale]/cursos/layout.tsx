import { Link } from '@/i18n/routing';
import { getAcademiaSession } from '@/lib/academia/auth';
import { createAcademiaServerClient } from '@/lib/academia/supabase/server';

async function logout() {
  'use server';
  const supabase = await createAcademiaServerClient();
  await supabase.auth.signOut();
}

export default async function CursosLayout({ children }: { children: React.ReactNode }) {
  const session = await getAcademiaSession();
  const isStudent = session?.role === 'student';
  const isInstructor = session?.role === 'instructor';
  const isAdmin = session?.role === 'admin';

  if (isStudent || isInstructor || isAdmin) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4">
            <Link href="/academia" className="font-semibold text-primary">
              Academia
            </Link>
            {session?.role === 'student' ? (
              <Link href="/cursos/alumno" className="text-sm hover:underline">
                Mis cursos
              </Link>
            ) : null}
            {session?.role === 'admin' ? (
              <Link href="/cursos/admin" className="text-sm hover:underline">
                Administrar cursos
              </Link>
            ) : null}
            {session?.role === 'instructor' ? (
              <Link href="/cursos/instructor" className="text-sm hover:underline">
                Mis cursos asignados
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{session?.email}</span>
            <form action={logout}>
              <button type="submit" className="text-primary hover:underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
