import { createAcademiaServerClient } from '@/lib/academia/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { avatarFromMetadata } from '@/lib/academia/avatars';

export interface AdminProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export async function getAdminProfile(userId: string): Promise<AdminProfile | null> {
  const db = getSupabaseServiceClient();
  const { data: profile } = await db
    .from('course_admin_profiles')
    .select('id, full_name')
    .eq('id', userId)
    .maybeSingle();

  const supabase = await createAcademiaServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: userId,
    fullName: profile?.full_name?.trim() || user.email?.split('@')[0] || 'Administrador',
    email: user.email ?? '',
    avatarUrl: avatarFromMetadata(user.user_metadata ?? {}),
  };
}

export async function updateAdminProfileFields(userId: string, fullName: string): Promise<void> {
  const db = getSupabaseServiceClient();
  const { error } = await db
    .from('course_admin_profiles')
    .update({ full_name: fullName.trim() })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}
