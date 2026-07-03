import { createAcademiaServerClient } from '@/lib/academia/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { avatarFromMetadata } from '@/lib/academia/avatars';

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
}

export async function getStudentProfile(userId: string): Promise<StudentProfile | null> {
  const db = getSupabaseServiceClient();
  const { data: profile } = await db
    .from('course_student_profiles')
    .select('id, full_name, phone')
    .eq('id', userId)
    .maybeSingle();

  const supabase = await createAcademiaServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: userId,
    fullName: profile?.full_name?.trim() || user.email?.split('@')[0] || 'Estudiante',
    email: user.email ?? '',
    phone: profile?.phone?.trim() || null,
    avatarUrl: avatarFromMetadata(user.user_metadata ?? {}),
  };
}

export async function updateStudentProfileFields(
  userId: string,
  fullName: string,
  phone: string | null,
): Promise<void> {
  const db = getSupabaseServiceClient();
  const { error } = await db
    .from('course_student_profiles')
    .update({
      full_name: fullName.trim(),
      phone: phone?.trim() || null,
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

export {
  deleteStoredAvatarIfOwned,
  uploadAcademiaAvatar as uploadStudentAvatar,
} from '@/lib/academia/avatars';
export {
  updateAcademiaUserAvatarUrl as updateStudentAvatarUrl,
  updateAcademiaUserPassword as updateStudentPassword,
} from '@/lib/academia/profile-auth';
