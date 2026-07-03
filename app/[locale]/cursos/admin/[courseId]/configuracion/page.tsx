import { AdminCourseSettingsForm } from '@/components/features/academia/admin/AdminCourseSettingsForm';

export default async function AdminConfiguracionPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <AdminCourseSettingsForm courseId={courseId} />;
}
