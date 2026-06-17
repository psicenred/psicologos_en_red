import fs from 'fs';
import path from 'path';
import { getSupabaseServiceClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  STORAGE_BUCKETS,
  type StorageBucket,
  encodeStorageRef,
  parseStorageRef,
} from '@/lib/storage/types';

export { STORAGE_BUCKETS, encodeStorageRef, parseStorageRef };

export interface StorageUploadResult {
  /** Valor a guardar en DB (ruta local relativa o ref sb://) */
  storedPath: string;
  /** URL pública si aplica (blog) */
  publicUrl: string | null;
}

function localRootForBucket(bucket: StorageBucket): string {
  switch (bucket) {
    case STORAGE_BUCKETS.blogImages:
      return path.join(process.cwd(), 'public', 'uploads', 'blog');
    case STORAGE_BUCKETS.psychologistDocs:
      return path.join(process.cwd(), 'uploads', 'documentos');
    case STORAGE_BUCKETS.chatAttachments:
      return path.join(process.cwd(), 'uploads', 'chat');
  }
}

/** Sube archivo: Supabase si está configurado; si no, disco local (sandbox). */
export async function storageUpload(
  bucket: StorageBucket,
  objectKey: string,
  data: Buffer,
  contentType: string,
): Promise<StorageUploadResult> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServiceClient();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectKey, data, { contentType, upsert: true });
    if (error) throw new Error(error.message);

    const ref = encodeStorageRef(bucket, objectKey);
    if (bucket === STORAGE_BUCKETS.blogImages) {
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectKey);
      return { storedPath: ref, publicUrl: pub.publicUrl };
    }
    return { storedPath: ref, publicUrl: null };
  }

  const root = localRootForBucket(bucket);
  const fullPath = path.join(root, objectKey);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, data);

  if (bucket === STORAGE_BUCKETS.blogImages) {
    const fileName = path.basename(objectKey);
    return {
      storedPath: `uploads/blog/${fileName}`,
      publicUrl: `/uploads/blog/${fileName}`,
    };
  }
  if (bucket === STORAGE_BUCKETS.psychologistDocs) {
    return {
      storedPath: path.join('documentos', objectKey).replace(/\\/g, '/'),
      publicUrl: null,
    };
  }
  return {
    storedPath: path.join('chat', objectKey).replace(/\\/g, '/'),
    publicUrl: null,
  };
}

/** Lee bytes desde Supabase o disco según la referencia guardada en DB. */
export async function storageRead(
  storedPath: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const ref = parseStorageRef(storedPath);
  if (ref && isSupabaseConfigured()) {
    const supabase = getSupabaseServiceClient();
    const { data, error } = await supabase.storage
      .from(ref.bucket)
      .download(ref.key);
    if (error || !data) return null;
    const buf = Buffer.from(await data.arrayBuffer());
    return { data: buf, contentType: guessContentType(ref.key) };
  }

  const localPath = storedPath.startsWith('uploads/blog/')
    ? path.join(process.cwd(), 'public', storedPath)
    : path.join(process.cwd(), 'uploads', storedPath);

  if (!fs.existsSync(localPath)) return null;
  return {
    data: fs.readFileSync(localPath),
    contentType: guessContentType(localPath),
  };
}

export async function storageSignedUrl(
  storedPath: string,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const ref = parseStorageRef(storedPath);
  if (!ref || !isSupabaseConfigured()) return null;
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(ref.bucket)
    .createSignedUrl(ref.key, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function guessContentType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

/** URL para servir al cliente (pública o firmada). */
export async function storageResolvePublicUrl(
  storedPath: string,
): Promise<string | null> {
  if (storedPath.startsWith('/uploads/')) return storedPath;
  if (storedPath.startsWith('uploads/blog/')) {
    return '/' + storedPath;
  }
  const ref = parseStorageRef(storedPath);
  if (!ref) return null;
  if (ref.bucket === STORAGE_BUCKETS.blogImages && isSupabaseConfigured()) {
    const supabase = getSupabaseServiceClient();
    const { data } = supabase.storage.from(ref.bucket).getPublicUrl(ref.key);
    return data.publicUrl;
  }
  return storageSignedUrl(storedPath);
}
