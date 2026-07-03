'use client';

import { AdminSidebar } from '@/components/features/academia/admin/AdminSidebar';

interface AdminShellProps {
  adminName: string;
  adminEmail: string;
  avatarUrl: string | null;
  logoutAction: () => void;
  children: React.ReactNode;
}

export function AdminShell({
  adminName,
  adminEmail,
  avatarUrl,
  logoutAction,
  children,
}: AdminShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-hueso)] md:flex-row">
      <AdminSidebar
        adminName={adminName}
        adminEmail={adminEmail}
        avatarUrl={avatarUrl}
        logoutAction={logoutAction}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
