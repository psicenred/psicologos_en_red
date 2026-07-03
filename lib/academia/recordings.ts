import { getSupabaseServiceClient } from '@/lib/supabase';
import { assertCourseInstructor } from '@/lib/academia/course-instructors';
import { listRoomRecordings } from '@/lib/academia/daily';
import type { CourseLiveSession } from '@/lib/academia/types';

export async function setSessionRecordingUrl(
  instructorId: string,
  sessionId: string,
  recordingUrl: string,
) {
  const db = getSupabaseServiceClient();
  const { data: session, error } = await db
    .from('course_live_sessions')
    .select('*, cohort:course_cohorts(course_id)')
    .eq('id', sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!session) throw new Error('Sesión no encontrada');

  const courseId = (session.cohort as { course_id: string }).course_id;
  await assertCourseInstructor(courseId, instructorId);

  const { data, error: upErr } = await db
    .from('course_live_sessions')
    .update({ recording_url: recordingUrl.trim(), status: 'completed' })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (upErr) throw new Error(upErr.message);
  return data as CourseLiveSession;
}

function pickRecordingUrl(
  recordings: { download_link?: string; share_token?: string; status?: string }[],
): string | null {
  const finished = recordings.find(
    (r) => r.status === 'finished' && (r.download_link || r.share_token),
  );
  if (!finished) return null;
  if (finished.download_link) return finished.download_link;
  if (finished.share_token) {
    return `https://daily.co/rec/${finished.share_token}`;
  }
  return null;
}

export async function syncPendingSessionRecordings(): Promise<{
  scanned: number;
  updated: number;
}> {
  const db = getSupabaseServiceClient();
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 2);

  const { data: sessions, error } = await db
    .from('course_live_sessions')
    .select('id, daily_room_name, scheduled_at')
    .is('recording_url', null)
    .not('daily_room_name', 'is', null)
    .lt('scheduled_at', cutoff.toISOString())
    .limit(50);

  if (error) throw new Error(error.message);
  if (!sessions?.length) return { scanned: 0, updated: 0 };

  let updated = 0;
  for (const session of sessions) {
    const roomName = session.daily_room_name as string;
    const recordings = await listRoomRecordings(roomName);
    const url = pickRecordingUrl(recordings);
    if (!url) continue;

    await db
      .from('course_live_sessions')
      .update({ recording_url: url, status: 'completed' })
      .eq('id', session.id);

    updated += 1;
  }

  return { scanned: sessions.length, updated };
}
