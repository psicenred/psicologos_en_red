import { AlumnoPageHeader } from '@/components/features/academia/alumno/AlumnoPageHeader';
import { StudentCertificatePanel } from '@/components/features/academia/courses/StudentCertificatePanel';

export default async function AlumnoCertificadoPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return (
    <div>
      <AlumnoPageHeader
        title="Certificado"
        description="Obtén tu certificado de finalización cuando cumplas los requisitos del curso."
      />
      <StudentCertificatePanel courseId={courseId} />
    </div>
  );
}
