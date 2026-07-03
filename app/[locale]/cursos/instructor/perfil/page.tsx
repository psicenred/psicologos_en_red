import { notFound } from 'next/navigation';
import { InstructorProfileForm } from '@/components/features/academia/instructor/InstructorProfileForm';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { getInstructorProfile } from '@/lib/academia/instructors';

export default async function InstructorPerfilPage() {
  const session = await requireAcademiaRole('instructor');
  const profile = await getInstructorProfile(session.userId);
  if (!profile) notFound();

  return <InstructorProfileForm initialProfile={profile} />;
}
