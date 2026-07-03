import type { CourseAnnouncement } from '@/lib/academia/types';

export type AnnouncementVisibilityStatus = 'scheduled' | 'active' | 'expired';

export function getAnnouncementVisibilityStatus(
  announcement: Pick<CourseAnnouncement, 'visible_from' | 'visible_until' | 'created_at'>,
  now: Date = new Date(),
): AnnouncementVisibilityStatus {
  const start = new Date(announcement.visible_from ?? announcement.created_at);
  const end = announcement.visible_until ? new Date(announcement.visible_until) : null;

  if (now < start) return 'scheduled';
  if (end && now >= end) return 'expired';
  return 'active';
}

export function isAnnouncementVisibleToStudents(
  announcement: Pick<CourseAnnouncement, 'visible_from' | 'visible_until' | 'created_at'>,
  now: Date = new Date(),
): boolean {
  return getAnnouncementVisibilityStatus(announcement, now) === 'active';
}

export function announcementVisibilityLabel(status: AnnouncementVisibilityStatus): string {
  if (status === 'scheduled') return 'Programado';
  if (status === 'expired') return 'Finalizado';
  return 'Visible';
}
