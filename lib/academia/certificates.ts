import { randomBytes } from 'crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { getCourseById } from '@/lib/academia/courses';
import { computeEvaluationProgress } from '@/lib/academia/evaluation-progress';
import { getEnrollment } from '@/lib/academia/enrollments';
import { getStudentFinalGrade } from '@/lib/academia/grades';
import type { CertificateEligibility, CourseCertificate } from '@/lib/academia/types';

const MIN_GRADE = 70;

function generateCertificateCode(): string {
  return `PER-${randomBytes(6).toString('hex').toUpperCase()}`;
}

export async function getCertificateEligibility(
  studentId: string,
  courseId: string,
): Promise<CertificateEligibility> {
  const db = getSupabaseServiceClient();

  const { data: existing } = await db
    .from('course_certificates')
    .select('*')
    .eq('student_id', studentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existing) {
    return {
      eligible: true,
      grade: Number(existing.final_grade),
      progressPct: 100,
      certificate: existing as CourseCertificate,
    };
  }

  const enrollment = await getEnrollment(studentId, courseId);
  if (!enrollment || !['active', 'completed'].includes(enrollment.status)) {
    return {
      eligible: false,
      reason: 'Debes tener una inscripción activa para obtener el certificado',
      grade: null,
      progressPct: 0,
      certificate: null,
    };
  }

  const gradeRow = await getStudentFinalGrade(studentId, courseId);
  const course = await getCourseById(courseId);
  const gradingMode = course?.grading_mode ?? 'weighted';
  const passStatus = gradeRow?.pass_status ?? 'pending';
  const grade = gradeRow?.computed_grade != null ? Number(gradeRow.computed_grade) : null;

  const { progressPct, total: totalEvals, completed } = await computeEvaluationProgress(
    studentId,
    courseId,
  );

  if (gradingMode === 'pass_fail') {
    if (passStatus !== 'passed') {
      return {
        eligible: false,
        reason:
          passStatus === 'failed'
            ? 'No cumples los requisitos para el certificado (reprobado)'
            : 'El instructor aún no ha registrado tu resultado (aprobado/reprobado)',
        grade,
        progressPct,
        certificate: null,
      };
    }
    if (totalEvals > 0 && completed < totalEvals) {
      return {
        eligible: false,
        reason: 'Debes completar todas las evaluaciones del curso',
        grade,
        progressPct,
        certificate: null,
      };
    }
    return { eligible: true, grade: grade ?? 100, progressPct, certificate: null };
  }

  if (grade == null || grade < MIN_GRADE) {
    return {
      eligible: false,
      reason: `Necesitas una calificación final de al menos ${MIN_GRADE}`,
      grade,
      progressPct,
      certificate: null,
    };
  }

  if (totalEvals > 0 && completed < totalEvals) {
    return {
      eligible: false,
      reason: 'Debes completar todas las evaluaciones del curso',
      grade,
      progressPct,
      certificate: null,
    };
  }

  return { eligible: true, grade, progressPct, certificate: null };
}

export async function issueCertificate(studentId: string, courseId: string) {
  const eligibility = await getCertificateEligibility(studentId, courseId);
  if (!eligibility.eligible) {
    throw new Error(eligibility.reason ?? 'No cumples los requisitos del certificado');
  }
  if (eligibility.certificate) return eligibility.certificate;

  const db = getSupabaseServiceClient();
  const code = generateCertificateCode();

  const { data, error } = await db
    .from('course_certificates')
    .insert({
      student_id: studentId,
      course_id: courseId,
      certificate_code: code,
      final_grade: eligibility.grade,
    })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as CourseCertificate;
}

export async function buildCertificatePdf(params: {
  studentName: string;
  courseTitle: string;
  finalGrade: number;
  certificateCode: string;
  issuedAt: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const purple = rgb(0.4, 0.3, 0.7);

  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: purple,
    borderWidth: 2,
  });

  page.drawText('Psicólogos en Red — Academia', {
    x: 60,
    y: height - 80,
    size: 14,
    font,
    color: purple,
  });

  page.drawText('Certificado de finalización', {
    x: 60,
    y: height - 120,
    size: 28,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText('Se certifica que', { x: 60, y: height - 170, size: 14, font });
  page.drawText(params.studentName, {
    x: 60,
    y: height - 200,
    size: 22,
    font: fontBold,
  });

  page.drawText('ha completado satisfactoriamente el curso', {
    x: 60,
    y: height - 235,
    size: 14,
    font,
  });

  page.drawText(params.courseTitle, {
    x: 60,
    y: height - 265,
    size: 18,
    font: fontBold,
    color: purple,
  });

  page.drawText(`Calificación final: ${params.finalGrade}`, {
    x: 60,
    y: height - 310,
    size: 14,
    font,
  });

  const issued = new Date(params.issuedAt).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  page.drawText(`Fecha de emisión: ${issued}`, { x: 60, y: height - 340, size: 12, font });
  page.drawText(`Código de verificación: ${params.certificateCode}`, {
    x: 60,
    y: 70,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });

  return doc.save();
}

export async function getCertificatePdfForStudent(studentId: string, courseId: string) {
  const certificate = await issueCertificate(studentId, courseId);
  const course = await getCourseById(courseId);
  if (!course) throw new Error('Curso no encontrado');

  const db = getSupabaseServiceClient();
  const { data: profile } = await db
    .from('course_student_profiles')
    .select('full_name')
    .eq('id', studentId)
    .maybeSingle();

  const pdf = await buildCertificatePdf({
    studentName: profile?.full_name || 'Alumno/a',
    courseTitle: course.title,
    finalGrade: Number(certificate.final_grade),
    certificateCode: certificate.certificate_code,
    issuedAt: certificate.issued_at,
  });

  return { pdf, certificate, course };
}

export async function verifyCertificateCode(code: string) {
  const db = getSupabaseServiceClient();
  const { data, error } = await db
    .from('course_certificates')
    .select(
      `
      *,
      student:course_student_profiles(full_name),
      course:course_courses(title)
    `,
    )
    .eq('certificate_code', code.trim().toUpperCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    code: data.certificate_code as string,
    final_grade: Number(data.final_grade),
    issued_at: data.issued_at as string,
    student_name: (data.student as { full_name: string | null })?.full_name,
    course_title: (data.course as { title: string })?.title,
  };
}
