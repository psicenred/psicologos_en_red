'use client';

import { AlumnoSidebar } from '@/components/features/academia/alumno/AlumnoSidebar';

interface AlumnoShellProps {
  studentName: string;
  studentEmail: string;
  avatarUrl: string | null;
  logoutAction: () => void;
  children: React.ReactNode;
}

export function AlumnoShell({
  studentName,
  studentEmail,
  avatarUrl,
  logoutAction,
  children,
}: AlumnoShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-hueso)] md:flex-row">
      <AlumnoSidebar
        studentName={studentName}
        studentEmail={studentEmail}
        avatarUrl={avatarUrl}
        logoutAction={logoutAction}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
