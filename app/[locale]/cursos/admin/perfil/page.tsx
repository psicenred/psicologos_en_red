import { notFound } from 'next/navigation';
import { AdminProfileForm } from '@/components/features/academia/admin/AdminProfileForm';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { getAdminProfile } from '@/lib/academia/admins';

export default async function AdminPerfilPage() {
  const session = await requireAcademiaRole('admin');
  const profile = await getAdminProfile(session.userId);
  if (!profile) notFound();

  return <AdminProfileForm initialProfile={profile} />;
}
