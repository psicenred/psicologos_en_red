import { redirect } from 'next/navigation';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { createAcademiaServerClient } from '@/lib/academia/supabase/server';
import type { AcademiaRole } from '@/lib/academia/types';

export interface AcademiaSession {
  userId: string;
  email: string;
  role: AcademiaRole | null;
}

export async function getAcademiaSession(): Promise<AcademiaSession | null> {
  const supabase = await createAcademiaServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const role = await resolveAcademiaRole(user.id);
  return { userId: user.id, email: user.email, role };
}

export async function resolveAcademiaRole(userId: string): Promise<AcademiaRole | null> {
  const db = getSupabaseServiceClient();

  const { data: admin } = await db
    .from('course_admin_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (admin) return 'admin';

  const { data: student } = await db
    .from('course_student_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (student) return 'student';

  const { data: instructor } = await db
    .from('course_instructor_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (instructor) return 'instructor';

  return null;
}

export async function createAcademiaProfile(
  userId: string,
  role: AcademiaRole,
  fullName: string,
  phone?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getSupabaseServiceClient();

  const { data: existingStudent } = await db
    .from('course_student_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  const { data: existingInstructor } = await db
    .from('course_instructor_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingStudent || existingInstructor) {
    return { ok: false, error: 'Esta cuenta ya tiene un perfil de academia.' };
  }

  if (role === 'student') {
    const { error } = await db.from('course_student_profiles').insert({
      id: userId,
      full_name: fullName,
      phone: phone ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const { error } = await db.from('course_instructor_profiles').insert({
    id: userId,
    full_name: fullName,
    status: 'approved',
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function academiaDashboardPath(role: AcademiaRole): string {
  if (role === 'admin') return '/cursos/admin';
  return role === 'instructor' ? '/cursos/instructor' : '/cursos/alumno';
}

export async function requireAcademiaRole(
  ...roles: AcademiaRole[]
): Promise<AcademiaSession & { role: AcademiaRole }> {
  const session = await getAcademiaSession();
  if (!session?.role || !roles.includes(session.role)) {
    redirect('/academia/login');
  }
  return session as AcademiaSession & { role: AcademiaRole };
}
