export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || '';

export type MetaPixelEvent =
  | 'PageView'
  | 'CompleteRegistration'
  | 'Schedule'
  | 'Purchase'
  | 'Lead'
  | 'InitiateCheckout'
  | 'Contact'
  | 'ViewContent';

declare global {
  interface Window {
    fbq?: (
      action: 'track' | 'trackCustom' | 'init',
      eventOrId: string,
      params?: Record<string, unknown>,
    ) => void;
    _fbq?: unknown;
  }
}

/** Dispara un evento estándar del Meta Pixel (no-op si no hay Pixel / fbq). */
export function trackMetaEvent(
  event: MetaPixelEvent | (string & {}),
  params?: Record<string, unknown>,
): void {
  if (!META_PIXEL_ID || typeof window === 'undefined') return;
  if (typeof window.fbq !== 'function') return;
  if (params) window.fbq('track', event, params);
  else window.fbq('track', event);
}
