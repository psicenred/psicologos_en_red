import { redirect } from 'next/navigation';
import { academiaDashboardPath, getAcademiaSession } from '@/lib/academia/auth';

export default async function CursosRootPage() {
  const session = await getAcademiaSession();

  if (!session) {
    redirect('/academia/login?next=/cursos');
  }

  if (!session.role) {
    redirect('/academia/login?next=/cursos');
  }

  redirect(academiaDashboardPath(session.role));
}
