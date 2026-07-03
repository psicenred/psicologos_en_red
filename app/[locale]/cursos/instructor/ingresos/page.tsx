import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { InstructorRevenuePanel } from '@/components/features/academia/courses/InstructorRevenuePanel';

export default function InstructorIngresosPage() {
  return (
    <div>
      <AlumnoPageHeader
        title="Ingresos"
        description="Reporte informativo de pagos recibidos y tu parte estimada por curso."
      />
      <InstructorRevenuePanel />
    </div>
  );
}
