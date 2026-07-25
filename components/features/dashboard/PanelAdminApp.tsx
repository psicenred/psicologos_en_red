'use client';

import { useState } from 'react';
import { AdminContabilidadSection } from '@/components/features/admin/AdminContabilidadSection';
import { AdminShell } from '@/components/features/admin/AdminShell';
import { AdminWhatsappSection } from '@/components/features/admin/AdminWhatsappSection';
import {
  AdminBlogSection,
  AdminCitasSection,
  AdminConfigSection,
  AdminDashboardSection,
  AdminPacientesSection,
  AdminPsicologosSection,
} from '@/components/features/admin/AdminSections';
import type { AdminPanelInitialData } from '@/lib/admin/types';

export function PanelAdminApp({
  initialData,
}: {
  initialData: AdminPanelInitialData | null;
}) {
  const [section, setSection] = useState('dashboard');

  return (
    <AdminShell section={section} onSectionChange={setSection}>
      {section === 'dashboard' && <AdminDashboardSection initialData={initialData} />}
      {section === 'citas' && <AdminCitasSection initialData={initialData} />}
      {section === 'psicologos' && <AdminPsicologosSection initialData={initialData} />}
      {section === 'pacientes' && <AdminPacientesSection initialData={initialData} />}
      {section === 'contabilidad' && <AdminContabilidadSection />}
      {section === 'whatsapp' && <AdminWhatsappSection />}
      {section === 'blog' && <AdminBlogSection initialData={initialData} />}
      {section === 'configuracion' && <AdminConfigSection initialData={initialData} />}
    </AdminShell>
  );
}
