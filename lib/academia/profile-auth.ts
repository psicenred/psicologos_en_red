import { createAcademiaServerClient } from '@/lib/academia/supabase/server';

export async function updateAcademiaUserPassword(newPassword: string): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }

  const supabase = await createAcademiaServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function updateAcademiaUserAvatarUrl(avatarUrl: string | null): Promise<void> {
  const supabase = await createAcademiaServerClient();
  const { error } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl },
  });
  if (error) throw new Error(error.message);
}
