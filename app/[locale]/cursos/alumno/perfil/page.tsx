import { notFound } from 'next/navigation';
import { StudentProfileForm } from '@/components/features/academia/alumno/StudentProfileForm';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { getStudentProfile } from '@/lib/academia/students';

export default async function AlumnoPerfilPage() {
  const session = await requireAcademiaRole('student');
  const profile = await getStudentProfile(session.userId);
  if (!profile) notFound();

  return <StudentProfileForm initialProfile={profile} />;
}
