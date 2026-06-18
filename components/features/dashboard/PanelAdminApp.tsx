'use client';

import { useState } from 'react';
import { AdminShell } from '@/components/features/admin/AdminShell';
import {
  AdminBlogSection,
  AdminCitasSection,
  AdminConfigSection,
  AdminDashboardSection,
  AdminPacientesSection,
  AdminPsicologosSection,
} from '@/components/features/admin/AdminSections';

export function PanelAdminApp() {
  const [section, setSection] = useState('dashboard');

  return (
    <AdminShell section={section} onSectionChange={setSection}>
      {section === 'dashboard' && <AdminDashboardSection />}
      {section === 'citas' && <AdminCitasSection />}
      {section === 'psicologos' && <AdminPsicologosSection />}
      {section === 'pacientes' && <AdminPacientesSection />}
      {section === 'blog' && <AdminBlogSection />}
      {section === 'configuracion' && <AdminConfigSection />}
    </AdminShell>
  );
}
