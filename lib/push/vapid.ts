export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

export function getVapidPrivateKey(): string | null {
  const key = process.env.VAPID_PRIVATE_KEY?.trim();
  return key || null;
}

/** mailto: o https: exigido por la especificación VAPID */
export function getVapidSubject(): string {
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (subject) return subject;
  return 'mailto:contacto@psicologosenred.com';
}
