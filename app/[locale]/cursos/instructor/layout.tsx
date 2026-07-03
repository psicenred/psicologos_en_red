import { InstructorShell } from '@/components/features/academia/instructor/InstructorShell';
import { academiaLogoutAction } from '@/lib/academia/actions';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { getInstructorProfile } from '@/lib/academia/instructors';

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAcademiaRole('instructor');
  const profile = await getInstructorProfile(session.userId);

  return (
    <InstructorShell
      instructorName={profile?.fullName ?? session.email}
      instructorEmail={profile?.email ?? session.email}
      avatarUrl={profile?.avatarUrl ?? null}
      logoutAction={academiaLogoutAction}
    >
      {children}
    </InstructorShell>
  );
}
