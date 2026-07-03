import path from 'path';
import { getAssignmentById } from '@/lib/academia/assignments';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { isPdfBuffer } from '@/lib/security/file-validation';
import { STORAGE_BUCKETS, storageUpload } from '@/lib/storage';

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function uploadAssignmentSubmissionPdf(
  studentId: string,
  assignmentId: string,
  buffer: Buffer,
  originalName: string,
): Promise<string> {
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error('El PDF no puede superar 15 MB');
  }
  if (!isPdfBuffer(buffer)) {
    throw new Error('Solo se permiten archivos PDF válidos');
  }

  const assignment = await getAssignmentById(assignmentId);
  if (!assignment) throw new Error('Tarea no encontrada');

  const db = getSupabaseServiceClient();
  const { data: enrollment } = await db
    .from('course_enrollments')
    .select('status')
    .eq('student_id', studentId)
    .eq('course_id', assignment.course_id)
    .maybeSingle();

  if (!enrollment || enrollment.status !== 'active') {
    throw new Error('No tienes acceso activo a este curso');
  }

  const { data: existing } = await db
    .from('course_assignment_submissions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) throw new Error('Ya enviaste esta tarea');

  const ext = path.extname(originalName || '').toLowerCase() === '.pdf' ? '.pdf' : '.pdf';
  const objectKey = `${assignment.course_id}/${assignmentId}/${studentId}/${Date.now()}${ext}`;

  const { storedPath } = await storageUpload(
    STORAGE_BUCKETS.academiaSubmissions,
    objectKey,
    buffer,
    'application/pdf',
  );

  return storedPath;
}
