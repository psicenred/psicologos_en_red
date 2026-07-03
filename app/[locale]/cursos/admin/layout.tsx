import { AdminShell } from '@/components/features/academia/admin/AdminShell';
import { academiaLogoutAction } from '@/lib/academia/actions';
import { requireAcademiaRole } from '@/lib/academia/auth';
import { getAdminProfile } from '@/lib/academia/admins';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAcademiaRole('admin');
  const profile = await getAdminProfile(session.userId);

  return (
    <AdminShell
      adminName={profile?.fullName ?? session.email}
      adminEmail={profile?.email ?? session.email}
      avatarUrl={profile?.avatarUrl ?? null}
      logoutAction={academiaLogoutAction}
    >
      {children}
    </AdminShell>
  );
}
