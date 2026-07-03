import { InstructorAnnouncementsPanel } from '@/components/features/academia/courses/InstructorAnnouncementsPanel';

export default async function InstructorAvisosPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  return <InstructorAnnouncementsPanel courseId={courseId} />;
}
