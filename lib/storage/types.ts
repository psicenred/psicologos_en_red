export const STORAGE_BUCKETS = {
  blogImages: 'blog-images',
  psychologistDocs: 'psychologist-docs',
  chatAttachments: 'chat-attachments',
} as const;

export type StorageBucket =
  (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

/** Referencia en DB: `sb://bucket/path/to/object` */
export const STORAGE_REF_PREFIX = 'sb://';

export function encodeStorageRef(bucket: StorageBucket, key: string): string {
  return `${STORAGE_REF_PREFIX}${bucket}/${key}`;
}

export function parseStorageRef(
  value: string,
): { bucket: StorageBucket; key: string } | null {
  if (!value.startsWith(STORAGE_REF_PREFIX)) return null;
  const rest = value.slice(STORAGE_REF_PREFIX.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash) as StorageBucket;
  const key = rest.slice(slash + 1);
  if (!key) return null;
  if (
    bucket !== STORAGE_BUCKETS.blogImages &&
    bucket !== STORAGE_BUCKETS.psychologistDocs &&
    bucket !== STORAGE_BUCKETS.chatAttachments
  ) {
    return null;
  }
  return { bucket, key };
}
