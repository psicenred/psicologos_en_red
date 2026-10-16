/** Utilidades Web Push en el navegador (solo cliente). */

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const mq = window.matchMedia('(display-mode: standalone)').matches;
  const ios =
    'standalone' in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || ios;
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function supportsWebPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch {
    return null;
  }
}

/** Globo rojo en el icono de la PWA (home screen). Requiere permiso de notificaciones en iOS. */
export async function syncAppBadge(count: number): Promise<void> {
  if (typeof navigator === 'undefined') return;
  const n = Math.max(0, Math.floor(Number(count) || 0));
  try {
    if (n > 0 && 'setAppBadge' in navigator) {
      await navigator.setAppBadge(n);
    } else if (n === 0 && 'clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
    }
  } catch {
    // Sin permiso o plataforma sin soporte: ignorar
  }
}
