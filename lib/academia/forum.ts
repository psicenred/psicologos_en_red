import { getSupabaseServiceClient } from '@/lib/supabase';
import type {
  CourseForumReply,
  CourseForumThread,
  CourseForumThreadDetail,
  CourseForumThreadListItem,
} from '@/lib/academia/types';

async function assertActiveEnrollment(studentId: string, courseId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_enrollments')
    .select('status')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.status !== 'active') {
    throw new Error('No tienes acceso activo a este curso');
  }
}

async function assertCanReadForum(studentId: string, courseId: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_enrollments')
    .select('status')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || !['active', 'payment_overdue'].includes(data.status)) {
    throw new Error('No tienes acceso a este curso');
  }
}

function studentNameFromJoin(
  student: { full_name?: string } | { full_name?: string }[] | null | undefined,
): string {
  if (Array.isArray(student)) return student[0]?.full_name ?? 'Alumno';
  return student?.full_name ?? 'Alumno';
}

export async function listForumThreads(
  studentId: string,
  courseId: string,
): Promise<CourseForumThreadListItem[]> {
  await assertCanReadForum(studentId, courseId);
  const db = getSupabaseServiceClient();

  const { data: threads, error } = await db
    .from('course_forum_threads')
    .select(
      `
      *,
      student:course_student_profiles(full_name)
    `,
    )
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = CourseForumThread & {
    student?: { full_name?: string } | { full_name?: string }[] | null;
  };

  const rows = (threads ?? []) as Row[];
  const threadIds = rows.map((t) => t.id);
  const countMap = new Map<string, number>();

  if (threadIds.length > 0) {
    const { data: replyRows, error: countErr } = await db
      .from('course_forum_replies')
      .select('thread_id')
      .in('thread_id', threadIds);

    if (countErr) throw new Error(countErr.message);
    for (const r of replyRows ?? []) {
      const tid = r.thread_id as string;
      countMap.set(tid, (countMap.get(tid) ?? 0) + 1);
    }
  }

  return rows.map((t) => ({
    id: t.id,
    course_id: t.course_id,
    student_id: t.student_id,
    title: t.title,
    body: t.body,
    created_at: t.created_at,
    student_name: studentNameFromJoin(t.student),
    reply_count: countMap.get(t.id) ?? 0,
  }));
}

export async function getForumThread(
  studentId: string,
  threadId: string,
): Promise<CourseForumThreadDetail | null> {
  const db = getSupabaseServiceClient();

  const { data: thread, error } = await db
    .from('course_forum_threads')
    .select(
      `
      *,
      student:course_student_profiles(full_name)
    `,
    )
    .eq('id', threadId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!thread) return null;

  await assertCanReadForum(studentId, thread.course_id as string);

  const { data: replies, error: repErr } = await db
    .from('course_forum_replies')
    .select(
      `
      *,
      student:course_student_profiles(full_name)
    `,
    )
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (repErr) throw new Error(repErr.message);

  type ReplyRow = CourseForumReply & {
    student?: { full_name?: string } | { full_name?: string }[] | null;
  };

  return {
    id: thread.id,
    course_id: thread.course_id,
    student_id: thread.student_id,
    title: thread.title,
    body: thread.body,
    created_at: thread.created_at,
    student_name: studentNameFromJoin(
      thread.student as { full_name?: string } | { full_name?: string }[] | null,
    ),
    replies: ((replies ?? []) as ReplyRow[]).map((r) => ({
      id: r.id,
      thread_id: r.thread_id,
      student_id: r.student_id,
      body: r.body,
      created_at: r.created_at,
      student_name: studentNameFromJoin(r.student),
    })),
  };
}

export async function createForumThread(
  studentId: string,
  courseId: string,
  title: string,
  body: string,
): Promise<CourseForumThread> {
  await assertActiveEnrollment(studentId, courseId);

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  if (!trimmedTitle) throw new Error('El título es obligatorio');
  if (!trimmedBody) throw new Error('Escribe tu pregunta');

  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_forum_threads')
    .insert({
      course_id: courseId,
      student_id: studentId,
      title: trimmedTitle,
      body: trimmedBody,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseForumThread;
}

export async function createForumReply(
  studentId: string,
  threadId: string,
  body: string,
): Promise<CourseForumReply> {
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error('Escribe tu respuesta');

  const db = getSupabaseServiceClient();
  const { data: thread, error: threadErr } = await db
    .from('course_forum_threads')
    .select('course_id')
    .eq('id', threadId)
    .maybeSingle();

  if (threadErr) throw new Error(threadErr.message);
  if (!thread) throw new Error('Pregunta no encontrada');

  await assertActiveEnrollment(studentId, thread.course_id as string);

  const { data, error } = await db
    .from('course_forum_replies')
    .insert({
      thread_id: threadId,
      student_id: studentId,
      body: trimmedBody,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseForumReply;
}
