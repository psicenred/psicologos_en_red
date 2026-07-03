import { createAcademiaServerClient } from '@/lib/academia/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { avatarFromMetadata } from '@/lib/academia/avatars';

export interface InstructorProfile {
  id: string;
  fullName: string;
  email: string;
  bio: string | null;
  avatarUrl: string | null;
}

export async function getInstructorProfile(userId: string): Promise<InstructorProfile | null> {
  const db = getSupabaseServiceClient();
  const { data: profile } = await db
    .from('course_instructor_profiles')
    .select('id, full_name, bio')
    .eq('id', userId)
    .maybeSingle();

  const supabase = await createAcademiaServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: userId,
    fullName: profile?.full_name?.trim() || user.email?.split('@')[0] || 'Instructor',
    email: user.email ?? '',
    bio: profile?.bio?.trim() || null,
    avatarUrl: avatarFromMetadata(user.user_metadata ?? {}),
  };
}

export async function updateInstructorProfileFields(
  userId: string,
  fullName: string,
  bio: string | null,
): Promise<void> {
  const db = getSupabaseServiceClient();
  const { error } = await db
    .from('course_instructor_profiles')
    .update({
      full_name: fullName.trim(),
      bio: bio?.trim() || null,
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
