import { AlumnoShell } from '@/components/features/academia/alumno/AlumnoShell';
import { academiaLogoutAction } from '@/lib/academia/actions';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { getStudentProfile } from '@/lib/academia/students';

export default async function AlumnoLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAcademiaRole('student');

  const profile = await getStudentProfile(session.userId);

  return (
    <AlumnoShell
      studentName={profile?.fullName ?? session.email}
      studentEmail={profile?.email ?? session.email}
      avatarUrl={profile?.avatarUrl ?? null}
      logoutAction={academiaLogoutAction}
    >
      {children}
    </AlumnoShell>
  );
}
