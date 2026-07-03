import { getSupabaseServiceClient, isSupabaseConfigured } from '@/lib/supabase';
import fs from 'fs';
import path from 'path';

export const AVATAR_BUCKET = 'blog-images';

export function avatarFromMetadata(meta: Record<string, unknown>): string | null {
  if (typeof meta.avatar_url === 'string' && meta.avatar_url.trim()) {
    return meta.avatar_url.trim();
  }
  if (typeof meta.picture === 'string' && meta.picture.trim()) {
    return meta.picture.trim();
  }
  return null;
}

export async function uploadAcademiaAvatar(
  userId: string,
  buffer: Buffer,
  contentType: string,
  ext: string,
): Promise<string> {
  const objectKey = `academia-avatars/${userId}/avatar-${Date.now()}${ext}`;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(objectKey, buffer, { contentType, upsert: true });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectKey);
    return data.publicUrl;
  }

  const localDir = path.join(process.cwd(), 'public', 'uploads', 'academia-avatars', userId);
  fs.mkdirSync(localDir, { recursive: true });
  const fileName = `avatar-${Date.now()}${ext}`;
  fs.writeFileSync(path.join(localDir, fileName), buffer);
  return `/uploads/academia-avatars/${userId}/${fileName}`;
}

export async function deleteStoredAvatarIfOwned(
  userId: string,
  avatarUrl: string | null,
): Promise<void> {
  if (!avatarUrl) return;

  const supabasePrefix = `/storage/v1/object/public/${AVATAR_BUCKET}/academia-avatars/${userId}/`;
  if (avatarUrl.includes(supabasePrefix) || avatarUrl.includes(`academia-avatars/${userId}/`)) {
    const keyMatch = avatarUrl.match(/academia-avatars\/[^/]+\/[^/?#]+/);
    if (keyMatch && isSupabaseConfigured()) {
      const supabase = getSupabaseServiceClient();
      await supabase.storage.from(AVATAR_BUCKET).remove([keyMatch[0]]);
    }
  }

  const localPrefix = `/uploads/academia-avatars/${userId}/`;
  if (avatarUrl.startsWith(localPrefix)) {
    const localPath = path.join(process.cwd(), 'public', avatarUrl);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
  }
}
