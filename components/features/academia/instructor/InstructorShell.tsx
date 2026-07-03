'use client';

import { InstructorSidebar } from '@/components/features/academia/instructor/InstructorSidebar';

interface InstructorShellProps {
  instructorName: string;
  instructorEmail: string;
  avatarUrl: string | null;
  logoutAction: () => void;
  children: React.ReactNode;
}

export function InstructorShell({
  instructorName,
  instructorEmail,
  avatarUrl,
  logoutAction,
  children,
}: InstructorShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-hueso)] md:flex-row">
      <InstructorSidebar
        instructorName={instructorName}
        instructorEmail={instructorEmail}
        avatarUrl={avatarUrl}
        logoutAction={logoutAction}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
